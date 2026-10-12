import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1).default("mysql://vixo:vixo_password@localhost:3306/Vixo"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:5173"),
  SESSION_COOKIE_NAME: z.string().default("vixo_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 ** 3),
  UPLOAD_CHUNK_BYTES: z.coerce.number().int().positive().default(8 * 1024 ** 2),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  HLS_SEGMENT_SECONDS: z.coerce.number().int().min(2).max(10).default(4),
  VIDEO_CRF: z.coerce.number().int().min(16).max(32).default(22),
  VIDEO_PRESET: z.string().default("medium"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().max(8).default(1),
  DELETE_SOURCE_AFTER_TRANSCODE: z.enum(["true", "false"]).default("false"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./storage"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("vixo"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
});

export const env = schema.parse(process.env);
