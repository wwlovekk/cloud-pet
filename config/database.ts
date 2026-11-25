import { isAbsolute, resolve } from "node:path";

/** Both Prisma CLI and the Node runtime must point to the same SQLite file. */
export function resolveDatabaseUrl(
  input = "file:./prisma/dev.db",
  projectRoot = process.cwd(),
): string {
  if (!input.startsWith("file:")) return input;
  const filename = input.slice("file:".length);
  if (!filename || filename === ":memory:" || filename.includes("?")) {
    throw new Error("Use a persistent SQLite file path without query parameters.");
  }
  const absolutePath = isAbsolute(filename) ? filename : resolve(projectRoot, filename);
  return `file:${absolutePath.replaceAll("\\", "/")}`;
}
