# Mudir: satu menu "Rekap Modul" berisi Tahfidz, Kurikulum, Kesantrian; menu Pesan ke Wali sudah tidak ada.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk
D = OUT / "modul"; D.mkdir(exist_ok=True)
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for u in ["syamsul", "hidayat"]:
            c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await masuk(pg, u)
            print(u, await pg.locator(".tiles .tile, .tiles button").all_inner_texts())
            await pg.screenshot(path=str(D / f"{u}_beranda.png"), full_page=True)
            await pg.click(".tiles >> text=Rekap Modul"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=str(D / f"{u}_modul.png"))
            for t in ["Tahfidz", "Kurikulum", "Kesantrian"]:
                await pg.click(f".mm-kartu >> text={t}"); await pg.wait_for_timeout(500); print(" ", t, (await pg.locator(".sub-h h1, h1").first.inner_text())[:40]); await pg.go_back(); await pg.wait_for_timeout(400)
            await c.close()
        print("ERR", errs); await b.close()
asyncio.run(main())
