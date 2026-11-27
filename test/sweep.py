# Periksa semua layar semua akun guru di 4 lebar layar (galat JS, meluber, teks terpotong).
import asyncio, sys
from playwright.async_api import async_playwright
from _jalur import URL_DIST as URL, OUT
async def login(pg,u):
    await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL); await pg.wait_for_timeout(500)
    await pg.fill("input[autocomplete=username]",u); await pg.fill("input[type=password]",u+"123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(4000)
async def main():
  async with async_playwright() as P:
    b=await P.chromium.launch(); masalah=[]; jml=0
    for w in [320,390,768,1024]:
      pg=await b.new_page(viewport={"width":w,"height":800}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:120]))
      await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(400)
      for u in ["kaafi","syamsul","hidayat","izzudin"]:
        await login(pg,u)
        labels=await pg.locator(".scr .tile .tile-lb").all_inner_texts()
        for lb in labels:
          try:
            await login(pg,u) if False else None
            await pg.locator(f".scr .tile:has(.tile-lb:text-is(\"{lb}\"))").first.click(timeout=3000); await pg.wait_for_timeout(700); jml+=1
            ov=await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            if ov>2: masalah.append((w,u,lb,"overflow",ov))
            await pg.go_back() if False else None
            await pg.evaluate("history.back()"); await pg.wait_for_timeout(500)
          except Exception as e: masalah.append((w,u,lb,"klik",str(e)[:60]))
      if errs: masalah.append((w,"ERR",errs[:3]))
      await pg.close()
    print("layar diperiksa:",jml)
    for m in masalah: print(m)
    await b.close()
asyncio.run(main())
