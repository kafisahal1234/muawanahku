# Tangkapan layar layar-layar utama (untuk meninjau tampilan) → test/out/tampil/
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
D = OUT / "tampil"; D.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await c.new_page(); await pg.goto(URL_DIST); await pg.evaluate(SEED_KEGIATAN)
        async def foto(n, full=True): await pg.wait_for_timeout(600); await pg.screenshot(path=str(D / f"{n}.png"), full_page=full)
        await pg.goto(URL_DIST); await pg.wait_for_timeout(600); await foto("0_login", False)
        await masuk(pg, "syamsul"); await foto("1_beranda")
        await pg.click(".tiles >> text=Tahfidz"); await foto("2_tahfidz")
        await pg.go_back(); await pg.wait_for_timeout(400)
        await pg.click(".bnav >> text=Jadwal"); await foto("3_jadwal")
        await pg.click(".bnav >> text=Akun"); await foto("4_akun")
        await pg.click(".bnav >> text=Riwayat"); await foto("5_riwayat")
        await b.close()
asyncio.run(main())
