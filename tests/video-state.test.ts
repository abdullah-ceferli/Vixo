import { describe, expect, it } from "vitest";
import { canTransitionVideo } from "@/lib/video-state";

describe("video processing state transitions", () => {
  it("allows the upload pipeline", () => {
    expect(canTransitionVideo("UPLOADING", "PROCESSING")).toBe(true);
    expect(canTransitionVideo("PROCESSING", "READY")).toBe(true);
  });
  it("does not publish directly from uploading", () => expect(canTransitionVideo("UPLOADING", "READY")).toBe(false));
  it("makes deletion terminal", () => expect(canTransitionVideo("DELETING", "READY")).toBe(false));
});
