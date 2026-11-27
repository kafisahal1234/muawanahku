# Butir "Puasa sunnah" di Mutaba'ah hanya muncul hari Senin (Puasa sunnah Senin) & Kamis (Puasa sunnah Kamis).
import asyncio, sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST
from _demo import masuk
HARAP = {"2026-11-23": "Puasa sunnah Senin", "2026-11-24": None, "2026-11-26": "Puasa sunnah Kamis", "2026-11-27": None}
async def main():
    gagal = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for tgl, harap in HARAP.items():
            c = await b.new_context(viewport={"width": 390, "height": 844}); pg = await c.new_page()
            await pg.clock.set_fixed_time(datetime.datetime.fromisoformat(tgl + "T19:00:00"))
            await pg.goto(URL_DIST); await masuk(pg, "ugi")
            await pg.click(".tiles >> text=Asrama Saya"); await pg.wait_for_timeout(500)
            await pg.click(".tiles >> text=Mutaba'ah"); await pg.wait_for_timeout(700)
            teks = await pg.locator("button.check").all_inner_texts()
            puasa = [t.strip() for t in teks if "Puasa" in t]
            ok = (puasa == [harap]) if harap else (puasa == [])
            print(tgl, "→", puasa or "(tidak muncul)", "OK" if ok else "SALAH")
            if not ok: gagal.append(tgl)
            await c.close()
        await b.close()
    print("gagal", gagal)
asyncio.run(main())
