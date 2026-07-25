import {
  base64ToPcm16,
  downsample,
  float32ToPcm16,
  pcm16ToBase64,
} from "../../src/features/interview/audio/pcm";

describe("PCM audio utilities", () => {
  it("clamps and converts float samples to PCM16", () => {
    expect(
      Array.from(float32ToPcm16(new Float32Array([-2, 0, 2]))),
    ).toEqual([-32768, 0, 32767]);
  });

  it("downsamples by averaging each source window", () => {
    const result = downsample(
      new Float32Array([0, 1, 0, 1, -1, -1, 1, 1]),
      48_000,
      16_000,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(1 / 3);
    expect(result[1]).toBeCloseTo(-1 / 3);
  });

  it("round-trips PCM16 through base64", () => {
    const pcm = new Int16Array([-32768, -1, 0, 1, 32767]);
    expect(Array.from(base64ToPcm16(pcm16ToBase64(pcm)))).toEqual(
      Array.from(pcm),
    );
  });
});
