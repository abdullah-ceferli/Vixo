"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { Captions, Expand, Gauge, LoaderCircle, Maximize, Minimize, Pause, PictureInPicture, Play, Settings2, Volume1, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/format";

type Quality = { index: number; height: number };

export function VideoPlayer({ videoId, source, poster, resumeAt = 0 }: { videoId: string; source: string; poster?: string | null; resumeAt?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const savedAt = useRef(0);
  const viewCounted = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [theater, setTheater] = useState(false);
  const [controls, setControls] = useState(true);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [quality, setQuality] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [menu, setMenu] = useState<"quality" | "speed" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current!;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(source); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(data.levels.map((level, index) => ({ index, height: level.height })).filter((item, index, list) => list.findIndex((other) => other.height === item.height) === index).sort((a, b) => b.height - a.height));
        setWaiting(false);
      });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setError("This video could not be played. Try reloading the page."); });
      return () => { hls.destroy(); hlsRef.current = null; };
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) { video.src = source; setWaiting(false); }
    else setError("Adaptive playback is not supported in this browser.");
  }, [source]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input, textarea, select")) return;
      const video = videoRef.current; if (!video) return;
      if ([" ", "k"].includes(event.key.toLowerCase())) { event.preventDefault(); if (video.paused) void video.play(); else video.pause(); }
      if (event.key.toLowerCase() === "m") { video.muted = !video.muted; setMuted(video.muted); }
      if (event.key.toLowerCase() === "f") toggleFullscreen();
      if (event.key.toLowerCase() === "t") toggleTheater();
      if (event.key.toLowerCase() === "j") video.currentTime = Math.max(0, video.currentTime - 10);
      if (event.key.toLowerCase() === "l") video.currentTime = Math.min(video.duration, video.currentTime + 10);
      if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 5);
      if (event.key === "ArrowRight") video.currentTime = Math.min(video.duration, video.currentTime + 5);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  });

  useEffect(() => () => { document.body.classList.remove("theater-mode"); }, []);

  function toggle() { const video = videoRef.current!; if (video.paused) void video.play(); else video.pause(); }
  function toggleTheater() { setTheater((value) => { document.body.classList.toggle("theater-mode", !value); return !value; }); }
  async function toggleFullscreen() { if (!document.fullscreenElement) await shellRef.current?.requestFullscreen(); else await document.exitFullscreen(); }
  async function pictureInPicture() { const video = videoRef.current!; if (document.pictureInPictureElement) await document.exitPictureInPicture(); else if (document.pictureInPictureEnabled) await video.requestPictureInPicture(); }
  function activity() { setControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); if (playing) hideTimer.current = setTimeout(() => setControls(false), 2500); }
  function saveProgress(seconds: number, completed = false) { fetch(`/api/videos/${videoId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds: Math.floor(seconds), completed }), keepalive: true }).catch(() => undefined); }
  function onTime() {
    const video = videoRef.current!; setCurrent(video.currentTime);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    if (!viewCounted.current && video.currentTime >= 10) { viewCounted.current = true; fetch(`/api/videos/${videoId}/progress`, { method: "PUT" }).catch(() => undefined); }
    if (video.currentTime - savedAt.current >= 10) { savedAt.current = video.currentTime; saveProgress(video.currentTime); }
  }

  return <div ref={shellRef} className="group relative aspect-video w-full overflow-hidden bg-black text-white shadow-sm sm:rounded-xl" onMouseMove={activity} onMouseLeave={() => playing && setControls(false)}>
    <video ref={videoRef} poster={poster || undefined} className="h-full w-full" playsInline preload="metadata" onClick={toggle} onPlay={() => { setPlaying(true); activity(); }} onPause={() => { setPlaying(false); setControls(true); }} onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onLoadedMetadata={(event) => { const target = event.currentTarget; setDuration(target.duration); if (resumeAt > 5 && resumeAt < target.duration - 10) target.currentTime = resumeAt; }} onTimeUpdate={onTime} onEnded={() => saveProgress(duration, true)} onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }} />
    {(waiting && !error) && <div className="pointer-events-none absolute inset-0 grid place-items-center"><LoaderCircle className="animate-spin" size={35} /></div>}
    {error && <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center"><div><Captions size={36} className="mx-auto mb-3 text-red-400" /><p className="font-semibold">Playback error</p><p className="mt-1 text-sm text-zinc-300">{error}</p></div></div>}
    {!playing && !waiting && !error && <button onClick={toggle} className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 backdrop-blur hover:scale-105"><Play size={29} fill="white" /></button>}
    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-2 pt-12 transition-opacity ${controls || !playing ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="group/timeline relative flex h-4 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/25"><div className="absolute h-full bg-white/35" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} /><div className="absolute h-full bg-red-500" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} /></div>
        <input aria-label="Seek video" className="absolute inset-x-0 w-full cursor-pointer opacity-0" type="range" min={0} max={duration || 0} step={0.1} value={current} onChange={(event) => { const time = Number(event.target.value); videoRef.current!.currentTime = time; setCurrent(time); }} />
      </div>
      <div className="flex h-10 items-center gap-1">
        <button onClick={toggle} className="grid h-9 w-9 place-items-center" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={21} fill="white" /> : <Play size={21} fill="white" />}</button>
        <button onClick={() => { const video = videoRef.current!; video.muted = !video.muted; }} className="grid h-9 w-9 place-items-center" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={21} /> : volume < .5 ? <Volume1 size={21} /> : <Volume2 size={21} />}</button>
        <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => { const video = videoRef.current!; video.volume = Number(event.target.value); video.muted = false; }} className="hidden h-1 w-20 accent-red-500 sm:block" />
        <span className="ml-1 text-xs tabular-nums text-white/90">{formatDuration(current)} / {formatDuration(duration)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <div className="relative"><button onClick={() => setMenu(menu === "speed" ? null : "speed")} className="grid h-9 w-9 place-items-center" aria-label="Playback speed"><Gauge size={21} /></button>{menu === "speed" && <div className="absolute bottom-11 right-0 w-36 overflow-hidden rounded-lg bg-zinc-900/95 py-1 text-sm shadow-xl backdrop-blur">{[.25, .5, .75, 1, 1.25, 1.5, 1.75, 2].map((value) => <button key={value} onClick={() => { videoRef.current!.playbackRate = value; setSpeed(value); setMenu(null); }} className={`flex w-full justify-between px-3 py-2 hover:bg-white/10 ${speed === value ? "font-bold" : ""}`}><span>{value === 1 ? "Normal" : `${value}×`}</span>{speed === value && <span>✓</span>}</button>)}</div>}</div>
          <div className="relative"><button onClick={() => setMenu(menu === "quality" ? null : "quality")} className="grid h-9 w-9 place-items-center" aria-label="Video quality"><Settings2 size={21} /></button>{menu === "quality" && <div className="absolute bottom-11 right-0 w-36 overflow-hidden rounded-lg bg-zinc-900/95 py-1 text-sm shadow-xl backdrop-blur"><button onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = -1; setQuality(-1); setMenu(null); }} className="flex w-full justify-between px-3 py-2 hover:bg-white/10"><span>Auto</span>{quality === -1 && <span>✓</span>}</button>{qualities.map((item) => <button key={item.index} onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = item.index; setQuality(item.index); setMenu(null); }} className="flex w-full justify-between px-3 py-2 hover:bg-white/10"><span>{item.height}p</span>{quality === item.index && <span>✓</span>}</button>)}</div>}</div>
          <button onClick={pictureInPicture} className="hidden h-9 w-9 place-items-center sm:grid" aria-label="Picture in picture"><PictureInPicture size={20} /></button>
          <button onClick={toggleTheater} className="hidden h-9 w-9 place-items-center lg:grid" aria-label="Theater mode"><Expand size={20} className={theater ? "text-red-400" : ""} /></button>
          <button onClick={toggleFullscreen} className="grid h-9 w-9 place-items-center" aria-label="Fullscreen">{fullscreen ? <Minimize size={21} /> : <Maximize size={21} />}</button>
        </div>
      </div>
    </div>
  </div>;
}
