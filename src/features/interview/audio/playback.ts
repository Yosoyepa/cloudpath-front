import { base64ToPcm16 } from "./pcm";

export class PcmPlayback {
  private context: AudioContext | null = null;
  private nextStart = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private pendingEnqueues = 0;
  private idleWaiters = new Set<() => void>();

  private notifyIdle(): void {
    if (this.pendingEnqueues > 0 || this.sources.size > 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }

  async enqueue(base64Pcm: string, sampleRate = 24_000): Promise<void> {
    this.pendingEnqueues += 1;
    try {
      this.context ??= new AudioContext({ sampleRate });
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      const pcm = base64ToPcm16(base64Pcm);
      const buffer = this.context.createBuffer(1, pcm.length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < pcm.length; index += 1) {
        channel[index] = (pcm[index] ?? 0) / 32_768;
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.onended = () => {
        this.sources.delete(source);
        this.notifyIdle();
      };
      this.sources.add(source);
      const startsAt = Math.max(this.context.currentTime, this.nextStart);
      source.start(startsAt);
      this.nextStart = startsAt + buffer.duration;
    } finally {
      this.pendingEnqueues -= 1;
      this.notifyIdle();
    }
  }

  async waitForIdle(maxWaitMs = 4_000): Promise<void> {
    if (this.pendingEnqueues === 0 && this.sources.size === 0) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.idleWaiters.delete(finish);
        globalThis.clearTimeout(timeout);
        resolve();
      };
      const timeout = globalThis.setTimeout(finish, maxWaitMs);
      this.idleWaiters.add(finish);
    });
  }

  clear(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // A source that already ended needs no cleanup.
      }
    }
    this.sources.clear();
    this.nextStart = 0;
    if (this.pendingEnqueues === 0) this.notifyIdle();
  }

  async close(): Promise<void> {
    this.clear();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}
