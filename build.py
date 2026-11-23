import subprocess, sys, datetime
BUILD = (datetime.datetime.utcnow() + datetime.timedelta(hours=7)).strftime("%d%m%y.%H%M")
r = subprocess.run(["npx", "esbuild", "src/main.js", "--bundle", "--format=iife", "--minify", "--target=es2019", "--define:__BUILD__=\"" + BUILD + "\"", "--outfile=dist/app.js"], capture_output=True, text=True)
print(r.stdout, r.stderr)
if r.returncode: sys.exit(1)
# pustaka pembaca dokumen (dimuat hanya saat dibutuhkan)
import os, shutil
os.makedirs("dist/vendor", exist_ok=True)
r2 = subprocess.run(["npx", "esbuild", "src/pdfkit_entry.js", "--bundle", "--format=iife", "--minify", "--target=es2019", "--external:canvg", "--external:dompurify", "--external:html2canvas", "--outfile=dist/vendor/pdfkit.js"], capture_output=True, text=True)
if r2.returncode: print(r2.stderr); raise SystemExit(1)
for src, dst in [("vendor/pdf.min.mjs", "pdf.min.mjs"), ("vendor/pdf.worker.min.mjs", "pdf.worker.min.mjs"), ("vendor/mammoth.browser.min.js", "mammoth.browser.min.js"), ("vendor/xlsx.mjs", "xlsx.mjs")]:
    shutil.copy(src, "dist/vendor/" + dst)
css = open("src/theme.css").read() + open("src/skin.css").read()
js = open("dist/app.js").read().replace("</script", "<\\/script")
# ikon aplikasi (PWA) dari logo
import base64, io, json, re
from PIL import Image
logo = re.search(r'export const LOGO = "data:image/png;base64,([^"]+)"', open("src/data.js").read()).group(1)
src_img = Image.open(io.BytesIO(base64.b64decode(logo))).convert("RGBA")
def ikon(n, pad, nama):
    bg = Image.new("RGBA", (n, n), (255, 255, 255, 255)); m = int(n * pad); w = n - 2 * m
    im = src_img.copy(); im.thumbnail((w, w), Image.LANCZOS); bg.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    bg.convert("RGB").save(f"dist/{nama}")
for n in (180, 192, 512): ikon(n, 0.10, f"icon-{n}.png")
ikon(512, 0.22, "icon-maskable-512.png")  # Android memotong ikon jadi lingkaran: logo diberi ruang aman
json.dump({"name": "MuawanahKu", "short_name": "MuawanahKu", "description": "Aplikasi Pondok Tahfidz Modern Kampung Qur'an Al Muawanah", "lang": "id",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait", "background_color": "#0B5D3B", "theme_color": "#0B5D3B",
    "icons": [{"src": "icon-192.png?v=2", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "icon-512.png?v=2", "sizes": "512x512", "type": "image/png", "purpose": "any"},
              {"src": "icon-maskable-512.png?v=2", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}], "id": "./"},
    open("dist/manifest.webmanifest", "w"))
open("dist/sw.js", "w").write("""// Service worker: utamakan jaringan (selalu versi terbaru), cadangan cache saat offline
const C = "mk-v5", FB = "mk-firebase-v1";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "./index.html", "./icon-192.png"]))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== FB).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // pustaka Firebase versi tetap (berkas tidak pernah berubah): ambil dari HP dulu, jaringan bila belum ada
  if (e.request.method === "GET" && u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/")) {
    e.respondWith(caches.open(FB).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return;
  }
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const nav = e.request.mode === "navigate" || /\/(index\.html)?$/.test(new URL(e.request.url).pathname);
  e.respondWith(fetch(nav ? new Request(e.request, { cache: "no-store" }) : e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
""")
html = f"""<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="color-scheme" content="light"><meta name="theme-color" content="#0B5D3B">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="MuawanahKu">
<meta name="format-detection" content="telephone=no"><meta name="description" content="Aplikasi Pondok Tahfidz Modern Kampung Qur'an Al Muawanah">
<link rel="manifest" href="manifest.webmanifest?v=2"><link rel="icon" type="image/png" href="icon-192.png?v=2"><link rel="apple-touch-icon" sizes="180x180" href="icon-180.png?v=2"><link rel="apple-touch-icon-precomposed" href="icon-180.png?v=2"><link rel="shortcut icon" href="icon-192.png?v=2">
<title>MuawanahKu</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800;6..12,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div id="root"></div><script>{js}</script></body></html>"""
open("dist/index.html", "w").write(html)
print("ok", len(html) // 1024, "KB")
