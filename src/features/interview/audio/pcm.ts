export function float32ToPcm16(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    output[index] =
      clamped < 0
        ? Math.round(clamped * 32_768)
        : Math.round(clamped * 32_767);
  }
  return output;
}

export function downsample(
  samples: Float32Array,
  inputRate: number,
  outputRate = 16_000,
): Float32Array {
  if (outputRate >= inputRate) {
    return samples.slice();
  }
  const ratio = inputRate / outputRate;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const result = new Float32Array(length);
  for (let outputIndex = 0; outputIndex < length; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(
      samples.length,
      Math.floor((outputIndex + 1) * ratio),
    );
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += samples[inputIndex] ?? 0;
    }
    result[outputIndex] = sum / Math.max(1, end - start);
  }
  return result;
}

export function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength,
  );
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return window.btoa(binary);
}

export function base64ToPcm16(data: string): Int16Array {
  const binary = window.atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 2),
  );
}
