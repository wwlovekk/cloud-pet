import type { CSSProperties } from "react";
export type IconName = "paw" | "sun" | "moon" | "flip" | "chevron" | "scene" | "sliders" | "volume" | "muted" | "expand" | "save" | "share" | "heart" | "leaf" | "close" | "check" | "cat" | "dog" | "sparkle";
const paths: Record<IconName, React.ReactNode> = {
  paw: <><ellipse cx="7.2" cy="7" rx="2" ry="2.7" transform="rotate(-25 7 7)"/><ellipse cx="12" cy="5" rx="2" ry="2.7"/><ellipse cx="17.2" cy="7" rx="2" ry="2.7" transform="rotate(25 17 7)"/><path d="M5.5 16c0-2 2-2.6 3.1-4.4 1.8-2.7 5-2.7 6.8 0 1.2 1.8 3.1 2.4 3.1 4.4 0 3.5-3.6 3-6.5 2.2-2.9.8-6.5 1.3-6.5-2.2Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon: <path d="M20.5 13.5A8.7 8.7 0 0 1 10.5 3 9 9 0 1 0 20.5 13.5Z"/>,
  flip: <><path d="M4 9a8 8 0 0 1 14-4l2 3M20 4v4h-4M20 15a8 8 0 0 1-14 4l-2-3m0 4v-4h4"/><path d="M9 12h6"/></>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  scene: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.3"/><path d="m4 17 5-5 4 4 3-3 4 4"/></>,
  sliders: <><path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  volume: <><path d="m11 4-5 4H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  muted: <><path d="m11 4-5 4H3v8h3l5 4V4Z"/><path d="m16 9 5 6m0-6-5 6"/></>,
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>,
  save: <><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></>,
  share: <><path d="M12 15V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2"/></>,
  heart: <path d="M20.5 5.5c-3-3-6-1.5-8.5 1-2.5-2.5-5.5-4-8.5-1C.5 9 3 13 12 20c9-7 11.5-11 8.5-14.5Z"/>,
  leaf: <><path d="M20 3C9 2 3 6 4 13c1 7 15 8 16-10Z"/><path d="M3 21 16 8"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>, check: <path d="m5 12 4 4L19 6"/>,
  cat: <><path d="m5 9-1-6 6 3h4l6-3-1 6c5 11-19 11-14 0Z"/><path d="M8 12h.01M16 12h.01m-5 3h2"/></>,
  dog: <><path d="m7 6-3-2c-3 3-4 8-1 10l3-3m11-5 3-2c3 3 4 8 1 10l-3-3M7 6c3-2 7-2 10 0l1 8c0 8-12 8-12 0Z"/><path d="M9 11h.01M15 11h.01m-4 4h2"/></>,
  sparkle: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>,
};
export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>{paths[name]}</svg>;
}
