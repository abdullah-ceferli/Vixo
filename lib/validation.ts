import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only"),
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(10).max(128).regex(/[A-Z]/, "Add an uppercase letter").regex(/[0-9]/, "Add a number"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const channelSchema = z.object({
  name: z.string().trim().min(2).max(100),
  handle: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dots, dashes, or underscores"),
  description: z.string().trim().max(5000).default(""),
  avatarUrl: z.union([z.string().url().max(1024).refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL"), z.literal("")]).optional().transform((value) => value === "" ? null : value),
  bannerUrl: z.union([z.string().url().max(1024).refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL"), z.literal("")]).optional().transform((value) => value === "" ? null : value),
});

export const uploadCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(20000).default(""),
  category: z.string().trim().min(1).max(60).default("General"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PRIVATE"),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().trim().min(1).max(120),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  parentId: z.string().cuid().nullable().optional(),
});

export const reactionSchema = z.object({ type: z.enum(["LIKE", "DISLIKE"]) });
export const progressSchema = z.object({ seconds: z.number().int().min(0).max(24 * 60 * 60), completed: z.boolean().default(false) });
export const playlistSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(2000).default(""), visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PRIVATE") });
