# Tangkapan layar rekap dengan data kegiatan contoh. Hasil: test/out/rekap/
import asyncio, os
from playwright.async_api import async_playwright
from _jalur import URL_DIST as URL, OUT
from _demo import SEED_KEGIATAN as SEED, masuk as login
async def main():
  async with async_playwright() as P:
    b=await P.chromium.launch(); pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200]))
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(600)
    print("absen",await pg.evaluate(SEED))
    out=str(OUT / "rekap")
    os.makedirs(out,exist_ok=True)
    for u,m,lb,fn in [("syamsul","Tahfidz","Rekap Tahfidz","t"),("syamsul","Kurikulum","Rekap KBM","k"),("syamsul","Kesantrian","Rekap Kesantrian","s"),("syamsul","Kesantrian","Rekap Asrama","a"),("izzudin","Tahfidz","Rekap Halaqah","h"),("kaafi","Mapel IT","Rekap Kelas","m"),("syamsul","Ceklis Musyrif",None,"c")]:
      await login(pg,u)
      try:
        await pg.locator(f".scr .tile:has(.tile-lb:text-is(\"{m}\"))").first.click(timeout=3000); await pg.wait_for_timeout(700)
        if lb: await pg.locator(f".tile:has(.tile-lb:text-is(\"{lb}\"))").first.click(timeout=3000); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f"{out}/{fn}.png",full_page=True); print(fn, await pg.evaluate("document.documentElement.scrollWidth - innerWidth"))
      except Exception as e: print("gagal",fn,str(e)[:80])
    await login(pg,"izzudin"); await pg.locator(".scr .tile:has(.tile-lb:text-is(\"Tahfidz\"))").first.click(); await pg.wait_for_timeout(500); await pg.locator(".tile:has(.tile-lb:text-is(\"Rekap Halaqah\"))").first.click(); await pg.wait_for_timeout(800)
    await pg.locator(".per-pick").click(); await pg.wait_for_timeout(400); await pg.screenshot(path=f"{out}/pilih.png")
    await pg.locator(".per-op:has-text('Tengah semester')").click(); await pg.wait_for_timeout(600); await pg.screenshot(path=f"{out}/mid.png")
    print("errs",errs); await b.close()
asyncio.run(main())
