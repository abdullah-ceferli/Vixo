import { describe, expect, it } from "vitest";
import { createMasterPlaylist, selectRenditions } from "@/lib/video";

describe("video rendition planning", () => {
  it("never upscales landscape video", () => {
    const profiles = selectRenditions(1280, 720);
    expect(profiles.map((item) => item.height)).toEqual([144, 240, 360, 480, 720]);
    expect(profiles.every((item) => item.width <= 1280)).toBe(true);
  });

  it("preserves portrait orientation", () => {
    const profiles = selectRenditions(1080, 1920);
    expect(profiles.at(-1)?.width).toBeLessThan(profiles.at(-1)!.height);
    expect(profiles.at(-1)?.width).toBeLessThanOrEqual(1080);
  });

  it("produces an adaptive HLS master manifest", () => {
    const profiles = selectRenditions(1920, 1080);
    const manifest = createMasterPlaylist(profiles);
    expect(manifest).toContain("#EXT-X-INDEPENDENT-SEGMENTS");
    expect(manifest).toContain("RESOLUTION=1920x1080");
    expect(manifest).toContain("1080p/index.m3u8");
  });
});
