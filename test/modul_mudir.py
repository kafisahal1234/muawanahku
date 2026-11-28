# Mudir: menu Tahfidz, Kurikulum, Kesantrian berisi daftar evaluasi (ringkas + keterangan); halaman gabungan bertab.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
D = OUT / "modul"; D.mkdir(exist_ok=True)
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for u in ["syamsul", "hidayat"]:
            c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KEGIATAN); await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await masuk(pg, u)
            print(u, await pg.locator(".tiles button").all_inner_texts())
            await pg.screenshot(path=str(D / f"{u}_beranda.png"))
            for t, sub in [("Tahfidz", "Peringkat & Tasmi'"), ("Kurikulum", "Jadwal & Pengampu"), ("Kesantrian", "Izin & Pelanggaran")]:
                await pg.click(f".tiles >> text={t}"); await pg.wait_for_timeout(700)
                await pg.screenshot(path=str(D / f"{u}_{t}.png"), full_page=True)
                await pg.click(f".ev-row >> text={sub}"); await pg.wait_for_timeout(600)
                await pg.screenshot(path=str(D / f"{u}_{t}_gabung1.png"))
                await pg.locator(".gb-seg button").nth(1).click(); await pg.wait_for_timeout(500)
                await pg.screenshot(path=str(D / f"{u}_{t}_gabung2.png"))
                await pg.go_back(); await pg.wait_for_timeout(300); await pg.go_back(); await pg.wait_for_timeout(500)
            await c.close()
        print("ERR", errs); await b.close()
asyncio.run(main())
