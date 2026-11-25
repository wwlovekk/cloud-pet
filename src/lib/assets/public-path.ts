export function publicAssetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_STATIC_BASE_PATH ?? "";
  return path.startsWith("/assets/") ? basePath + path : path;
}
