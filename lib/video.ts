export type RenditionProfile = { height: number; width: number; videoBitrate: number; audioBitrate: number; maxRate: number; bufferSize: number };

const LADDER: RenditionProfile[] = [
  { height: 144, width: 256, videoBitrate: 180_000, audioBitrate: 64_000, maxRate: 220_000, bufferSize: 360_000 },
  { height: 240, width: 426, videoBitrate: 320_000, audioBitrate: 64_000, maxRate: 400_000, bufferSize: 640_000 },
  { height: 360, width: 640, videoBitrate: 650_000, audioBitrate: 96_000, maxRate: 800_000, bufferSize: 1_300_000 },
  { height: 480, width: 854, videoBitrate: 1_100_000, audioBitrate: 128_000, maxRate: 1_350_000, bufferSize: 2_200_000 },
  { height: 720, width: 1280, videoBitrate: 2_500_000, audioBitrate: 128_000, maxRate: 3_000_000, bufferSize: 5_000_000 },
  { height: 1080, width: 1920, videoBitrate: 5_000_000, audioBitrate: 192_000, maxRate: 6_000_000, bufferSize: 10_000_000 },
  { height: 1440, width: 2560, videoBitrate: 9_000_000, audioBitrate: 192_000, maxRate: 10_800_000, bufferSize: 18_000_000 },
  { height: 2160, width: 3840, videoBitrate: 17_000_000, audioBitrate: 256_000, maxRate: 20_400_000, bufferSize: 34_000_000 },
];

export function selectRenditions(sourceWidth: number, sourceHeight: number) {
  const portrait = sourceHeight > sourceWidth;
  const sourceShortEdge = portrait ? sourceWidth : sourceHeight;
  const eligible = LADDER.filter((item) => item.height <= sourceShortEdge);
  const selected = eligible.length ? eligible : [LADDER[0]];
  return selected.map((item) => {
    const aspect = sourceWidth / sourceHeight;
    const height = portrait ? Math.round(item.height / aspect / 2) * 2 : item.height;
    const width = portrait ? item.height : Math.round(item.height * aspect / 2) * 2;
    return { ...item, width, height };
  });
}

export function createMasterPlaylist(profiles: RenditionProfile[]) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"];
  for (const profile of profiles) {
    const bandwidth = profile.maxRate + profile.audioBitrate;
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${profile.videoBitrate + profile.audioBitrate},RESOLUTION=${profile.width}x${profile.height},CODECS=\"avc1.640028,mp4a.40.2\"`);
    lines.push(`${profile.height}p/index.m3u8`);
  }
  return `${lines.join("\n")}\n`;
}
