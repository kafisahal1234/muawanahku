# Laporan Berkala: daftar, isi per peran (guru halaqah, Wadir, Mudir, wali), kartu terbit di Beranda → test/out/laporan/
import asyncio, sys
sys.path.insert(0, "test")
from playwright.async_api import async_playwright
from _jalur import URL_DIST
from _demo import masuk, SEED_KEGIATAN
OUT = "test/out/laporan/"
async def main():
    err = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.on("pageerror", lambda e: err.append(str(e)))
        await pg.goto(URL_DIST); await pg.evaluate(SEED_KEGIATAN); await pg.goto(URL_DIST)
        for u in ["ugi", "kaafi", "syamsul"]:
            await masuk(pg, u); await pg.wait_for_timeout(800)
            await pg.screenshot(path=f"{OUT}{u}_0_beranda.png")
            await pg.evaluate("document.querySelector('.tile:has(.tile-ic) ')") 
            await pg.evaluate("[...document.querySelectorAll('.tile')].find(t=>t.textContent.includes('Laporan')).click()"); await pg.wait_for_timeout(900)
            await pg.screenshot(path=f"{OUT}{u}_1_daftar.png")
            await pg.click(".lap-hero"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f"{OUT}{u}_2_baca.png", full_page=True)
            n = await pg.locator(".evx").count(); print(u, "bagian", n, "perlu", await pg.locator(".evx-ls li").count())
            if await pg.locator(".evx-rb").count():
                await pg.locator(".evx-rb").first.click(); await pg.wait_for_timeout(300)
                await pg.locator(".evx").first.screenshot(path=f"{OUT}{u}_3_rinci.png")
        # wali (akun demo)
        await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL_DIST); await pg.wait_for_timeout(600)
        await pg.locator("text=Wali Santri").first.click(); await pg.locator("text=Lihat semua akun demo").click(); await pg.wait_for_timeout(300)
        await pg.locator(".demo-acc").nth(3).click(); await pg.wait_for_timeout(4500)
        await pg.screenshot(path=f"{OUT}wali_0_beranda.png", full_page=True)
        await pg.evaluate("document.querySelector('.lap-kartu')?.click()"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f"{OUT}wali_1_baca.png", full_page=True)
        await b.close()
    print("ERR", err)
asyncio.run(main())
