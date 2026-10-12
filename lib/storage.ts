import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { safeStorageKey } from "@/lib/security";

export type StoredObject = { body: NodeJS.ReadableStream; size: number; contentType?: string; etag?: string };

export interface StorageProvider {
  put(key: string, source: string | Buffer, contentType?: string): Promise<void>;
  get(key: string, range?: { start: number; end?: number }): Promise<StoredObject>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
  private root = path.resolve(env.LOCAL_STORAGE_PATH);
  private target(key: string) {
    const target = path.resolve(this.root, safeStorageKey(key));
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error("Unsafe storage path");
    return target;
  }
  async put(key: string, source: string | Buffer) {
    const target = this.target(key);
    await mkdir(path.dirname(target), { recursive: true });
    const data = typeof source === "string" ? await readFile(source) : source;
    await writeFile(target, data);
  }
  async get(key: string, range?: { start: number; end?: number }) {
    const target = this.target(key);
    const info = await stat(target);
    return { body: createReadStream(target, range), size: info.size };
  }
  async exists(key: string) {
    try { await stat(this.target(key)); return true; } catch { return false; }
  }
  async delete(key: string) { await rm(this.target(key), { force: true }); }
  async deletePrefix(prefix: string) {
    const target = path.resolve(this.root, safeStorageKey(prefix));
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error("Unsafe storage path");
    await rm(target, { recursive: true, force: true });
  }
}

class S3Storage implements StorageProvider {
  private client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    credentials: env.S3_ACCESS_KEY && env.S3_SECRET_KEY ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } : undefined,
  });
  async put(key: string, source: string | Buffer, contentType?: string) {
    const body = typeof source === "string" ? createReadStream(source) : source;
    await this.client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: safeStorageKey(key), Body: body, ContentType: contentType }));
  }
  async get(key: string, range?: { start: number; end?: number }) {
    const Range = range ? `bytes=${range.start}-${range.end ?? ""}` : undefined;
    const object = await this.client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: safeStorageKey(key), Range }));
    if (!object.Body) throw new Error("Object body missing");
    return { body: object.Body as Readable, size: object.ContentLength ?? 0, contentType: object.ContentType, etag: object.ETag };
  }
  async exists(key: string) {
    try { await this.client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: safeStorageKey(key) })); return true; } catch { return false; }
  }
  async delete(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: safeStorageKey(key) })); }
  async deletePrefix(prefix: string) {
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: safeStorageKey(prefix), ContinuationToken: continuationToken }));
      const objects = page.Contents?.flatMap((item) => item.Key ? [{ Key: item.Key }] : []) ?? [];
      if (objects.length) await this.client.send(new DeleteObjectsCommand({ Bucket: env.S3_BUCKET, Delete: { Objects: objects, Quiet: true } }));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }
}

export const storage: StorageProvider = env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
