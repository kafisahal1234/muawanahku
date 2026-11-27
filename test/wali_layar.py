# Tangkapan layar semua tab akun wali dengan data contoh. Hasil: test/out/wali/
import asyncio, sys, os
from playwright.async_api import async_playwright
from _jalur import URL_DIST as URL, OUT
from _demo import SEED_KEGIATAN as SEED
OUT=str(OUT / "wali"); os.makedirs(OUT, exist_ok=True)
async def main():
  async with async_playwright() as P:
    b=await P.chromium.launch(); pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200]))
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(600); await pg.evaluate(SEED)
    await pg.goto(URL); await pg.wait_for_timeout(500)
    await pg.locator("text=Wali Santri").first.click(); await pg.locator("text=Lihat semua akun demo").click(); await pg.wait_for_timeout(300)
    await pg.locator(".demo-acc").nth(3).click(); await pg.wait_for_timeout(4500)
    await pg.screenshot(path=f"{OUT}/1_beranda.png", full_page=True)
    labs=await pg.locator(".bnav button").all_inner_texts(); print(labs)
    for i,l in enumerate(labs[1:],2):
      await pg.locator(".bnav button").nth(i-1).click(); await pg.wait_for_timeout(900)
      await pg.screenshot(path=f"{OUT}/{i}_{l.strip().split()[0]}.png", full_page=True)
    print("errs",errs); await b.close()
asyncio.run(main())
