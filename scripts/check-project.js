import { access, readFile } from "node:fs/promises";

const required = [
  "index.html", "styles.css", "app.js", "engine.js", "sw.js", "manifest.webmanifest",
  "assets/favicon.svg", "assets/icon-192.png", "assets/icon-512.png"
];

await Promise.all(required.map(file => access(file)));
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
if (manifest.display !== "standalone" || manifest.icons.length < 2) throw new Error("PWA manifest is incomplete");
const html = await readFile("index.html", "utf8");
for (const asset of ["styles.css", "app.js", "manifest.webmanifest"]) {
  if (!html.includes(asset)) throw new Error(`index.html does not reference ${asset}`);
}
const serviceWorker = await readFile("sw.js", "utf8");
for (const asset of required.slice(0, 9)) {
  if (!serviceWorker.includes(asset.replace("index.html", "./index.html")) && asset !== "sw.js") {
    throw new Error(`Service worker does not cache ${asset}`);
  }
}
console.log(`Red Dwarf project check passed (${required.length} essential files).`);
