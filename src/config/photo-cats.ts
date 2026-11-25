export const PHOTO_COATS = [
  { id: "kuro", name: "纯黑" },
  { id: "mugi", name: "橘猫" },
  { id: "hana", name: "三花" },
  { id: "shiro", name: "纯白" },
  { id: "saba", name: "银虎斑" },
  { id: "hachi", name: "奶牛" },
  { id: "kiji", name: "狸花" },
  { id: "gray", name: "蓝灰" },
  { id: "sabi", name: "玳瑁" },
  { id: "siam", name: "重点色" },
  { id: "ragdoll", name: "奶白长毛" },
  { id: "siberian", name: "棕虎斑" },
  { id: "norwegian", name: "银灰长毛" },
] as const;
export type PhotoCoatId = (typeof PHOTO_COATS)[number]["id"];
export type PhotoView = "back" | "belly";
export interface PhotoSettings { coat: PhotoCoatId; view: PhotoView; size: number; width: number; night: boolean; muted: boolean; volume: number }
export const PHOTO_DEFAULTS: PhotoSettings = { coat: "kuro", view: "back", size: 1, width: 1, night: false, muted: true, volume: .55 };
