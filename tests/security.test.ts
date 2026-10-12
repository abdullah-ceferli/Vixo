import { describe, expect, it } from "vitest";
import { canViewVideo } from "@/lib/access";
import { safeStorageKey } from "@/lib/security";

describe("video visibility", () => {
  const ready = { status: "READY", visibility: "PUBLIC", channel: { ownerId: "owner" } };
  it("allows ready public and unlisted videos", () => {
    expect(canViewVideo(ready)).toBe(true);
    expect(canViewVideo({ ...ready, visibility: "UNLISTED" })).toBe(true);
  });
  it("only allows owners to view private videos", () => {
    const privateVideo = { ...ready, visibility: "PRIVATE" };
    expect(canViewVideo(privateVideo, "owner")).toBe(true);
    expect(canViewVideo(privateVideo, "viewer")).toBe(false);
  });
  it("does not expose unfinished media", () => expect(canViewVideo({ ...ready, status: "PROCESSING" }, "owner")).toBe(false));
});

describe("storage paths", () => {
  it("accepts scoped object keys", () => expect(safeStorageKey("videos/abc/720p/index.m3u8")).toBe("videos/abc/720p/index.m3u8"));
  it("rejects traversal", () => expect(() => safeStorageKey("videos/../secret")).toThrow());
});
