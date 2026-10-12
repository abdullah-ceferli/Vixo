import { rm } from "node:fs/promises";
import { prisma } from "../lib/prisma";

async function main() {
  const expired = await prisma.uploadSession.findMany({
    where: { expiresAt: { lt: new Date() }, status: { in: ["CREATED", "UPLOADING", "FAILED", "CANCELLED"] } },
    select: { id: true, videoId: true, temporaryPath: true },
  });
  for (const upload of expired) {
    await rm(upload.temporaryPath, { force: true });
    await prisma.video.deleteMany({ where: { id: upload.videoId, status: { in: ["UPLOADING", "FAILED"] } } });
    await prisma.uploadSession.deleteMany({ where: { id: upload.id } });
  }
  console.log(`Cleaned ${expired.length} expired upload session${expired.length === 1 ? "" : "s"}.`);
}

main().finally(() => prisma.$disconnect());
