// A tiny static server for the website checks, with Node's built-ins only. It serves public/ under
// /casual-kitchen-express/, the address GitHub Pages uses, and 404.html for anything missing.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const PREFIX = "/casual-kitchen-express/";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  if (path.startsWith(PREFIX)) {
    let rel = normalize(path.slice(PREFIX.length)).replace(/^(\.\.[/\\])+/, "");
    if (rel === "" || rel === ".") rel = "index.html";
    try {
      const body = await readFile(join(ROOT, rel));
      res.writeHead(200, { "content-type": TYPES[extname(rel)] ?? "application/octet-stream" });
      return res.end(body);
    } catch {}
  }
  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(await readFile(join(ROOT, "404.html")));
}).listen(port, () => console.log(`http://localhost:${port}${PREFIX}`));
