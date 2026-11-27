import asyncio, subprocess, json, base64
from _jalur import DIST, URL_DIST, ADMIN, OUT
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8796", "-d", DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8796/index.html"; O = "/tmp/ui"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGNgYGD4z0AEYBxVSFUAAJ6/AQGG0UPDAAAAAElFTkSuQmCC")
MOCK = r"""
window.__AI_LOG = [];
window.__AI_MOCK = async ({ teks, sistem, berkas, json }) => {
  window.__AI_LOG.push({ teks, sistem, nb: berkas.length });
  await new Promise(r => setTimeout(r, 400));
  if (berkas.length) return "Foto berisi **jadwal piket**. Ringkasannya:\n1. Senin: Fulan\n2. Selasa: Ahmad";
  return "Berdasarkan data pekan ini, guru yang perlu perhatian:\n\n| Guru | Terlaksana | Jurnal |\n|---|---|---|\n| Ust. Rangga | 0/4 (0%) | 0% |\n| Ust. Yudistira | 1/4 (25%) | 0% |\n\n**Saran:**\n- Ingatkan absen & jurnal setiap selesai KBM\n- Cek di menu `Kurikulum → Rekap KBM`";
};
"""
async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, permissions=["clipboard-read", "clipboard-write"])
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.set_fixed_time("2026-11-23T10:30:00+07:00")
        await pg.add_init_script(MOCK)
        await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(500)
        await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill(".pass-in input", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=f"{O}/a0_home.png")
        await pg.locator(".ab-ai").first.click(); await pg.wait_for_timeout(700)
        notes.append(("bnav on asisten", await pg.locator(".bnav").count()))
        await pg.screenshot(path=f"{O}/a1_hero.png")
        await pg.locator(".chat-hero .chat-saran button").first.click(); await pg.wait_for_timeout(1500)
        log = await pg.evaluate("window.__AI_LOG")
        s = log[-1]["sistem"]
        notes.append(("sistem has guru block", "KINERJA GURU MAPEL" in s, "REKAP KELAS" in s, "JADWAL KBM HARI INI" in s, "KINERJA HALAQAH" in s, len(s)))
        gl = [x for x in s.split("\n") if x.startswith("Ust") or x.startswith("Ustadz")][:3]
        notes.append(("contoh baris guru", gl))
        notes.append(("tabel", await pg.locator(".ai-tbl table tr").count(), await pg.locator(".cm-act button").all_inner_texts()))
        await pg.screenshot(path=f"{O}/a2_jawab.png")
        await pg.locator(".cm-a .cm-act button:has-text('Salin')").click(); await pg.wait_for_timeout(300)
        notes.append(("clipboard", (await pg.evaluate("navigator.clipboard.readText()"))[:80]))
        # lampiran foto
        await pg.locator(".cb-plus").click(); await pg.wait_for_timeout(200); await pg.screenshot(path=f"{O}/a3_menu.png")
        await pg.locator("input[type=file][multiple][accept='image/*']").set_input_files({"name": "piket.png", "mimeType": "image/png", "buffer": PNG}); await pg.wait_for_timeout(800)
        notes.append(("lamp", await pg.locator(".lamp.foto").count()))
        await pg.fill(".chat-bar textarea", "Ini jadwal apa?"); await pg.screenshot(path=f"{O}/a4_lamp.png")
        await pg.locator(".chat-send").click(); await pg.wait_for_timeout(1500)
        log = await pg.evaluate("window.__AI_LOG"); notes.append(("berkas terkirim", log[-1]["nb"], "Percakapan sebelumnya" in log[-1]["teks"]))
        notes.append(("img in bubble", await pg.locator(".cm-img img").count()))
        await pg.screenshot(path=f"{O}/a5_foto.png", full_page=True)
        # percakapan baru lalu buka riwayat
        await pg.locator(".hdr-btn[aria-label='Percakapan baru']").click(); await pg.wait_for_timeout(300)
        notes.append(("hero after baru", await pg.locator(".chat-hero").count()))
        await pg.fill(".chat-bar textarea", "Buatkan pengumuman libur"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(1200)
        await pg.locator(".hdr-btn[aria-label='Riwayat percakapan']").click(); await pg.wait_for_timeout(400)
        notes.append(("riwayat", await pg.locator(".rc-buka b").all_inner_texts()))
        await pg.screenshot(path=f"{O}/a6_riwayat.png")
        await pg.locator(".rc-buka").nth(1).click(); await pg.wait_for_timeout(500)
        notes.append(("restored msgs", await pg.locator(".cm").count(), await pg.locator(".cm-img img").count()))
        # reload: percakapan tetap tersimpan
        await pg.reload(); await pg.wait_for_timeout(900)
        stored = await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('mk_ai_chat_')).map(k=>[k, JSON.parse(localStorage[k]).length])")
        notes.append(("stored", stored))
        # tombol Cari di beranda & layar lain tanpa navigasi bawah
        await pg.goto(U); await pg.wait_for_timeout(800)
        await pg.locator(".tile:has-text('Kurikulum')").first.click(); await pg.wait_for_timeout(500)
        notes.append(("bnav on kurikulum", await pg.locator(".bnav").count()))
        await pg.go_back(); await pg.wait_for_timeout(500); notes.append(("bnav back home", await pg.locator(".bnav").count()))
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False)[:400])
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
