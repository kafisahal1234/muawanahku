# Uji sinyal lemah/putus memakai Firebase TIRUAN (semua permintaan ke Google diblokir/diganti, tidak menyentuh database asli)
import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8785", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://127.0.0.2:8785/index.html"  # bukan "localhost" → aplikasi berperilaku seperti versi online
FAKE = {
 "firebase-app.js": "export const initializeApp = c => ({ name: '[DEFAULT]', options: c }); export const getApps = () => [];",
 "firebase-auth.js": "export const getAuth = () => (window.__auth ||= { currentUser: null, authStateReady: async () => {} }); export const signInAnonymously = async a => { a.currentUser = { uid: 'uji' }; }; export const initializeAuth = () => ({}); export const inMemoryPersistence = {};",
 "firebase-firestore.js": "export const initializeFirestore = () => ({}); export const persistentLocalCache = () => ({}); export const doc = (d, n, id) => ({ n, id }); export const collection = (d, n) => ({ n }); export const setDoc = async (r, v) => { (window.__writes ||= []).push([r.n, r.id]); }; export const deleteDoc = async r => { (window.__writes ||= []).push(['hapus', r.n, r.id]); }; export const onSnapshot = (q, o, cb) => { setTimeout(() => cb({ docs: [], metadata: { fromCache: false } }), 30); return () => {}; };",
 "firebase-app-check.js": "export const initializeAppCheck = () => ({}); export class ReCaptchaV3Provider { constructor() {} }",
}
async def main():
    errs, notes = [], []
    mode = {"putus": True}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
        async def route(r):
            url = r.request.url
            if "127.0.0.2" in url: return await r.continue_()
            name = url.split("/")[-1].split("?")[0]
            if "gstatic.com/firebasejs" in url and not mode["putus"] and name in FAKE:
                return await r.fulfill(status=200, content_type="application/javascript", body=FAKE[name], headers={"access-control-allow-origin": "*"})
            await r.abort()  # semua jaringan luar diblokir: tidak pernah menyentuh Firebase asli
        await ctx.route("**/*", route)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.set_fixed_time("2026-11-23T05:10:00+07:00")
        await pg.goto(U); await pg.wait_for_timeout(1500)
        notes.append(("banner saat putus", await pg.locator(".sync-bar").count()))
        await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill(".pass-in input", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        await pg.locator(".tile:has-text('Tahfidz')").first.click(); await pg.wait_for_timeout(400)
        await pg.locator(".tile:has-text('Absen Halaqah')").first.click(); await pg.wait_for_timeout(400)
        await pg.click("text=Simpan absen"); await pg.wait_for_timeout(700)
        notes.append(("antrean", await pg.evaluate("JSON.parse(localStorage.getItem('mk_antrean_v1')||'[]').map(x=>[x.col,x.id])"), await pg.locator(".sync-bar").inner_text()))
        notes.append(("tampil selesai", await pg.locator(".selesai-card").count()))
        await pg.screenshot(path="/tmp/ui/s1_putus.png")
        # buka ulang aplikasi saat masih putus: input tetap terlihat (dari antrean)
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.locator(".tile:has-text('Tahfidz')").first.click(); await pg.wait_for_timeout(400); await pg.locator(".tile:has-text('Absen Halaqah')").first.click(); await pg.wait_for_timeout(500)
        notes.append(("setelah buka ulang (putus)", await pg.locator(".selesai-card").count()))
        # sinyal kembali → Coba lagi → antrean terkirim
        mode["putus"] = False
        await pg.locator(".sync-bar button").click(); await pg.wait_for_timeout(3500)
        notes.append(("terkirim", await pg.evaluate("window.__writes || []"), "antrean sisa", await pg.evaluate("localStorage.getItem('mk_antrean_v1')"), "banner", await pg.locator(".sync-bar").count()))
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False)[:400])
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
