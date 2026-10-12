import { describe, expect, it } from "vitest";
import { registerSchema, uploadCreateSchema } from "@/lib/validation";

describe("authentication validation", () => {
  it("requires a strong password", () => expect(registerSchema.safeParse({ username: "viewer", email: "v@example.com", password: "weakpass" }).success).toBe(false));
  it("normalizes email addresses", () => expect(registerSchema.parse({ username: "viewer", email: " V@EXAMPLE.COM ", password: "Strongpass1" }).email).toBe("v@example.com"));
});

describe("upload metadata validation", () => {
  it("accepts real upload metadata", () => expect(uploadCreateSchema.safeParse({ title: "Field notes", description: "", visibility: "PUBLIC", category: "Education", tags: ["field"], fileName: "notes.mp4", fileSize: 1024, mimeType: "video/mp4" }).success).toBe(true));
  it("rejects empty and oversized metadata fields", () => expect(uploadCreateSchema.safeParse({ title: "", description: "", visibility: "PUBLIC", fileName: "", fileSize: 0, mimeType: "" }).success).toBe(false));
});
