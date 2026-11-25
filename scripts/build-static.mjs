import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const basePath = process.env.PET_STATIC_BASE_PATH ?? "";
if (!/^(?:\/[A-Za-z0-9._-]+)*$/.test(basePath) || basePath.split("/").some(segment => segment === "." || segment === "..")) {
  throw new Error("PET_STATIC_BASE_PATH must be an empty string or a path such as /cloud-pet");
}

await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/static-entry.tsx"],
  outdir: "dist",
  bundle: true,
  external: ["/assets/*"],
  minify: true,
  target: "es2022",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_STATIC_MODE": '"1"',
    "process.env.NEXT_PUBLIC_STATIC_BASE_PATH": JSON.stringify(basePath),
  },
  alias: { "@": "./src" },
  plugins: [{
    name: "tailwind",
    setup(builder) {
      builder.onLoad({ filter: /\.css$/ }, async ({ path }) => {
        const result = await postcss([tailwind()]).process(await readFile(path, "utf8"), { from: path });
        return { contents: result.css, loader: "css" };
      });
    },
  }],
});
await cp("public", "dist", { recursive: true });
await writeFile("dist/index.html", `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#fbf5ec"><meta name="description" content="轻轻摸摸猫。真实毛发、温柔呼噜，背面和正面都可以。"><title>撸撸猫</title><link rel="icon" href="${basePath}/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${basePath}/static-entry.css"></head><body><div id="root"></div><script type="module" src="${basePath}/static-entry.js"></script></body></html>`);
console.log("Photographic cat experience built at dist/ (all assets bundled locally).");
