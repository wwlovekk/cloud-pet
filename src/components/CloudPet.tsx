"use client";
import { useEffect, useRef, useState } from "react";
import { PHOTO_COATS, PHOTO_DEFAULTS, type PhotoSettings } from "@/config/photo-cats";
import { PhotoCatRenderer } from "@/engine/rendering/PhotoCatRenderer";
import { ComfortAudio } from "@/engine/audio/ComfortAudio";
import { publicAssetPath } from "@/lib/assets/public-path";
import type { PetConfiguration } from "@/types/pet";
import { Icon } from "./controls/Icon";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export default function CloudPet({ initial: _initial }: { initial?: PetConfiguration }) {
  const [settings, setSettings] = useState<PhotoSettings>({ ...PHOTO_DEFAULTS });
  const [hydrated, setHydrated] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [panel, setPanel] = useState(false), [full, setFull] = useState(false);
  const [soundRunning, setSoundRunning] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null), viewer = useRef<HTMLDivElement>(null), hand = useRef<HTMLDivElement>(null), panelRef = useRef<HTMLDivElement>(null), adjustButton = useRef<HTMLButtonElement>(null);
  const renderer = useRef<PhotoCatRenderer | null>(null), audio = useRef<ComfortAudio | null>(null), current = useRef(settings);
  current.current = settings;
  const pointer = useRef({ id: null as number | null, x: 0, y: 0, time: 0, angle: 0 });
  const keyboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundStarting = useRef(false);
  const change = (patch: Partial<PhotoSettings>) => setSettings(s => ({ ...s, ...patch }));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pet-cat-photo-v1") ?? "null");
      if (saved && PHOTO_COATS.some(c => c.id === saved.coat)) setSettings({ ...PHOTO_DEFAULTS, coat: saved.coat, view: saved.view === "belly" ? "belly" : "back", size: Number.isFinite(saved.size) ? clamp(saved.size, .65, 1) : 1, width: Number.isFinite(saved.width) ? clamp(saved.width, .8, 1.4) : 1, night: saved.night === true, muted: saved.muted !== false, volume: .55 });
    } catch { /* Default appearance remains usable if storage is unavailable. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.photoTheme = settings.night ? "night" : "day";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.night ? "#101722" : "#fbf5ec");
    if (hydrated) try { localStorage.setItem("pet-cat-photo-v1", JSON.stringify(settings)); } catch {}
    renderer.current?.update(settings); audio.current?.preferences(settings.muted, settings.volume);
  }, [settings, hydrated]);
  useEffect(() => {
    if (!canvas.current) return;
    renderer.current = new PhotoCatRenderer(canvas.current, current.current, success => { setReady(success); setFailed(!success); });
    const engine = new ComfortAudio();
    audio.current = engine;
    engine.preferences(current.current.muted, current.current.volume);
    const release = () => { pointer.current.id = null; renderer.current?.release(); audio.current?.update(false, 0, null, "cat"); if (hand.current) { hand.current.style.opacity = "0"; hand.current.dataset.pose = "open"; } };
    const visibility = () => { if (document.hidden) { release(); engine.suspend(); setSoundRunning(false); } };
    window.addEventListener("blur", release); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", visibility); if (keyboardTimer.current) clearTimeout(keyboardTimer.current); renderer.current?.destroy(); audio.current = null; engine.destroy(); };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node) && !adjustButton.current?.contains(event.target as Node)) setPanel(false); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Escape") { setPanel(false); setFull(false); } if (event.key.toLowerCase() === "m" && !(event.target instanceof HTMLInputElement)) void toggleSound(); };
    const fullscreenChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", keyboard); document.addEventListener("fullscreenchange", fullscreenChange);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); document.removeEventListener("fullscreenchange", fullscreenChange); };
  }, []);
  async function toggleSound() {
    const engine = audio.current;
    if (!engine || soundStarting.current) return;
    setSoundError(false);
    if (!current.current.muted && engine.running) {
      engine.preferences(true, current.current.volume);
      current.current = { ...current.current, muted: true };
      change({ muted: true });
      return;
    }

    soundStarting.current = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Start resume() directly in the click handler to retain the browser's user gesture.
      const resume = engine.unlock();
      await Promise.race([resume, new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio is still suspended")), 1500);
      })]);
      if (audio.current !== engine) return;
      if (!engine.running) throw new Error("Audio is still suspended");
      engine.preferences(false, current.current.volume);
      engine.playPreview();
      current.current = { ...current.current, muted: false };
      setSoundRunning(true);
      change({ muted: false });
    } catch {
      if (audio.current === engine) { setSoundRunning(false); setSoundError(true); }
    } finally {
      clearTimeout(timeout);
      soundStarting.current = false;
    }
  }

  function resumePetAudio() {
    const engine = audio.current;
    if (!engine || current.current.muted) return;
    if (engine.running) { setSoundRunning(true); return; }
    // On touchscreens the completed touch can activate audio after pointerdown could not.
    void engine.unlock().then(() => {
      if (audio.current === engine && engine.running) { setSoundRunning(true); setSoundError(false); }
    }).catch(() => {});
  }
  async function fullscreen() { if (document.fullscreenElement) { await document.exitFullscreen(); return; } if (full) { setFull(false); return; } try { await viewer.current?.requestFullscreen(); } catch { setFull(true); } }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top, p = pointer.current;
    if (p.id !== null && p.id !== event.pointerId) return;
    const now = performance.now(), dx = x - p.x, dy = y - p.y, length = Math.max(1, Math.hypot(dx, dy)), speed = Math.min(5, length / rect.width / Math.max(.016, (now - p.time) / 1000));
    const down = p.id === event.pointerId, region = renderer.current?.contact({ x, y }, down, { x: dx / length, y: dy / length }) ?? null;
    if (hand.current) {
      const width = Math.min(rect.width * .25, 287);
      const grip = region === "tail" && down;
      const tailAngle = (renderer.current?.gripAngle ?? 0) * 180 / Math.PI;
      const desired = grip ? clamp(tailAngle * .35, -26, 23) : clamp(dx * .5, -9, 9);
      p.angle += (desired - p.angle) * .2;
      hand.current.dataset.pose = grip ? "grip" : "open";
      hand.current.style.width = `${width}px`;
      hand.current.style.transform = `translate3d(${x}px,${y + (down ? 2 : -3)}px,0) rotate(${p.angle}deg) scale(${down ? .985 : 1})`;
      hand.current.style.opacity = region && (event.pointerType === "mouse" || down) ? "1" : "0";
    }
    event.currentTarget.style.cursor = region ? "none" : "default";
    audio.current?.update(down && !!region, speed, region, "cat");
    p.x = x; p.y = y; p.time = now;
  }
  function release(event?: React.PointerEvent<HTMLCanvasElement>) {
    if (event && pointer.current.id !== null && event.pointerId !== pointer.current.id) return;
    pointer.current.id = null; renderer.current?.release(); audio.current?.update(false, 0, null, "cat");
    if (hand.current) { hand.current.dataset.pose = "open"; if (event?.pointerType !== "mouse") hand.current.style.opacity = "0"; }
  }
  const selected = PHOTO_COATS.find(c => c.id === settings.coat)!;
  return <main className="photo-page">
    <div ref={viewer} className={`photo-viewer ${full ? "is-full" : ""}`}>
      <div className={`photo-stage ${ready ? "is-ready" : ""}`} style={{ backgroundImage: `url("${publicAssetPath("/assets/photoreal/window-seat.webp")}")` }}>
        <canvas ref={canvas} className="photo-canvas" tabIndex={0} aria-label={`${selected.name}猫咪${settings.view === "back" ? "背面" : "正面"}，按住滑动可抚摸，向外拖动尾巴可拉直，空格轻抚，T 键翻面`}
          onPointerDown={event => { if (pointer.current.id !== null) return; event.preventDefault(); pointer.current.id = event.pointerId; const rect = event.currentTarget.getBoundingClientRect(); pointer.current.x = event.clientX - rect.left; pointer.current.y = event.clientY - rect.top; pointer.current.time = performance.now(); event.currentTarget.setPointerCapture(event.pointerId); resumePetAudio(); move(event); }}
          onPointerMove={move} onPointerUp={event => { if (pointer.current.id === event.pointerId) resumePetAudio(); release(event); }} onPointerCancel={release} onLostPointerCapture={() => { if (pointer.current.id !== null) release(); }}
          onPointerLeave={() => { if (pointer.current.id === null && hand.current) hand.current.style.opacity = "0"; }}
          onKeyDown={event => { if (event.key.toLowerCase() === "t") change({ view: settings.view === "back" ? "belly" : "back" }); if (event.code === "Space" && !event.repeat) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); renderer.current?.contact({ x: rect.width * .4, y: rect.height * .5 }, true); resumePetAudio(); audio.current?.update(true, .3, "spine", "cat"); if (keyboardTimer.current) clearTimeout(keyboardTimer.current); keyboardTimer.current = setTimeout(() => release(), 600); } }}/>
        {/* The photograph includes the forearm and cuff, clipped naturally at the canvas edge. */}
        <div ref={hand} className="photo-hand" data-pose="open" aria-hidden="true">
          <img className="photo-hand-open" src={publicAssetPath("/assets/photoreal/hand-sage.webp")} alt="" draggable={false}/>
          <img className="photo-hand-grip" src={publicAssetPath("/assets/photoreal/hand-grip.webp")} alt="" draggable={false}/>
        </div>
        <div className="photo-moonlight" aria-hidden="true"/>
        {!ready && <div className="photo-loading" role="status">{failed ? <button onClick={() => window.location.reload()}>重新加载</button> : <span aria-label="正在准备猫咪"/>}</div>}
      </div>
      <div className="photo-toolbar">
        <div className="photo-coats" role="group" aria-label="选择猫咪">
          {PHOTO_COATS.map(coat => (
            <button key={coat.id} className={`photo-coat ${settings.coat === coat.id ? "selected" : ""}`} onClick={() => change({ coat: coat.id })} aria-label={coat.name} aria-pressed={settings.coat === coat.id} title={coat.name}>
              <span style={{ backgroundImage: `url("${publicAssetPath(`/assets/photoreal/${coat.id}/swatch.webp`)}")` }}/>
            </button>
          ))}
        </div>
        <div className="photo-tools">
          <div className="photo-views" role="group" aria-label="猫咪视角">
            {([['back', '背面'], ['belly', '正面']] as const).map(([view, name]) => (
              <button key={view} aria-pressed={settings.view === view} onClick={() => { if (hand.current) hand.current.style.opacity = "0"; change({ view }); }}>{name}</button>
            ))}
          </div>
          <button className="photo-tool" aria-label={settings.night ? "切换白天" : "切换月光"} title={settings.night ? "白天" : "月光"} onClick={() => change({ night: !settings.night })}><Icon name={settings.night ? "sun" : "moon"} size={16}/></button>
          <button ref={adjustButton} className={`photo-tool ${panel ? "active" : ""}`} aria-label="调整体型" title="调整体型" aria-expanded={panel} onClick={() => setPanel(!panel)}><Icon name="sliders" size={16}/></button>
          <button className="photo-tool" aria-label={settings.muted || !soundRunning ? "开启声音" : "静音"} title={settings.muted || !soundRunning ? "开启声音" : "静音"} onClick={() => void toggleSound()}><Icon name={settings.muted || !soundRunning ? "muted" : "volume"} size={16}/></button>
          <button className="photo-tool" aria-label={full ? "退出全屏" : "全屏"} title={full ? "退出全屏" : "全屏"} onClick={() => void fullscreen()}><Icon name="expand" size={16}/></button>
        </div>
        {soundError && <span className="photo-audio-error" role="status">声音未启动，请再点一次扬声器</span>}
        {panel && <div className="photo-proportions" role="dialog" aria-label="猫咪体型" ref={panelRef}>
          <div className="photo-range-row"><Icon name="cat" size={17}/><input aria-label="猫咪大小" type="range" min=".65" max="1" step=".01" value={settings.size} onChange={event => change({ size: +event.target.value })}/><Icon name="cat" size={26}/></div>
          <div className="photo-range-row"><span className="photo-body-silhouette slender"/><input aria-label="猫咪胖瘦" type="range" min=".8" max="1.4" step=".01" value={settings.width} onChange={event => change({ width: +event.target.value })}/><span className="photo-body-silhouette plump"/></div>
        </div>}
      </div>
      <footer className="photo-credit">
        <a href="https://github.com/wwlovekk" target="_blank" rel="noreferrer" title="访问 @wkkkkk 的 GitHub 主页">@wkkkkk</a>
      </footer>
      <span className="sr-only" role="status">{selected.name} · {settings.view === "back" ? "背面" : "正面"}</span>
    </div>
  </main>;
}
