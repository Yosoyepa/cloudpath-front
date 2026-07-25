import { downsample, float32ToPcm16, pcm16ToBase64 } from "./pcm";

export interface MicrophoneCapture {
  stop: () => Promise<void>;
}

export async function startMicrophoneCapture(
  onChunk: (base64Pcm: string) => void,
): Promise<MicrophoneCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const context = new AudioContext();
  await context.audioWorklet.addModule("/audio/pcm-capture-worklet.js");
  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, "cloudpath-pcm-capture");
  const silentGain = context.createGain();
  silentGain.gain.value = 0;

  worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
    const sixteenKhz = downsample(event.data, context.sampleRate);
    onChunk(pcm16ToBase64(float32ToPcm16(sixteenKhz)));
  };

  source.connect(worklet);
  worklet.connect(silentGain);
  silentGain.connect(context.destination);

  return {
    stop: async () => {
      worklet.port.onmessage = null;
      worklet.disconnect();
      source.disconnect();
      silentGain.disconnect();
      for (const track of stream.getTracks()) {
        track.stop();
      }
      if (context.state !== "closed") {
        await context.close();
      }
    },
  };
}
