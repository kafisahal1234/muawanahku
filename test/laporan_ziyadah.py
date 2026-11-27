# Unduh Laporan Ziyadah (PDF) dari aplikasi dengan data contoh. Hasil: test/out/
import asyncio
from playwright.async_api import async_playwright
from _jalur import URL_DIST as URL, OUT
from _demo import SEED_KEGIATAN as SEED, masuk as login
async def main():
  async with async_playwright() as P:
    b=await P.chromium.launch(); ctx=await b.new_context(accept_downloads=True,viewport={"width":390,"height":844}); pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200]))
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(600); await pg.evaluate(SEED)
    for u,m,lb,out in [("izzudin","Tahfidz","Rekap Halaqah",str(OUT / "laporan_ziyadah_satu.pdf")),("syamsul","Tahfidz","Rekap Tahfidz",str(OUT / "laporan_ziyadah_semua.pdf"))]:
      await login(pg,u)
      await pg.locator(f".scr .tile:has(.tile-lb:text-is(\"{m}\"))").first.click(); await pg.wait_for_timeout(600)
      await pg.locator(f".tile:has(.tile-lb:text-is(\"{lb}\"))").first.click(); await pg.wait_for_timeout(1000)
      await pg.locator("button:has-text('Unduh rekap')").click(); await pg.wait_for_timeout(300)
      async with pg.expect_download(timeout=60000) as dl:
        await pg.locator(".menu-row:has-text('Laporan Ziyadah')").click()
      d=await dl.value; await d.save_as(out); print("ok",out,d.suggested_filename)
    print("errs",errs); await b.close()
asyncio.run(main())
