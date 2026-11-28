# Menu Cari (akun pengurus): daftar santri berjejer, ketuk → rincian dengan kartu hafalan + peringkat, foto bisa diperbesar.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk
D = OUT / "cari"; D.mkdir(exist_ok=True)
FOTO = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K)||'{}');const ids=Object.keys(d.santriEdit||{});
 const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,200,200);g.addColorStop(0,'#3a8f62');g.addColorStop(1,'#e2a93b');x.fillStyle=g;x.fillRect(0,0,200,200);x.fillStyle='#fff';x.beginPath();x.arc(100,80,38,0,7);x.fill();x.fillRect(45,130,110,70);
 d.profil=d.profil||{};ids.slice(0,40).forEach(i=>d.profil['s_'+i]={foto:c.toDataURL('image/jpeg',.8)});localStorage.setItem(K,JSON.stringify(d));return ids.length;}"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for u in ["syamsul", "hidayat"]:
            c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL_DIST); await pg.wait_for_timeout(800); print("santri", await pg.evaluate(FOTO)); await pg.goto(URL_DIST); await pg.wait_for_timeout(800)
            await masuk(pg, u)
            await pg.screenshot(path=str(D / f"{u}_awal.png")); await pg.click(".fab-tab"); await pg.wait_for_timeout(800)
            await pg.screenshot(path=str(D / f"{u}_daftar.png"))
            await pg.locator(".akun-row").nth(1).click(); await pg.wait_for_timeout(900)
            await pg.screenshot(path=str(D / f"{u}_rincian1.png"))
            sh = pg.locator(".sheet-body, .sheet .body, .sheet").last
            await pg.mouse.wheel(0, 700); await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(D / f"{u}_rincian2.png"))
            await pg.mouse.wheel(0, 2000); await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(D / f"{u}_rincian3.png"))
            print(u, await pg.locator(".rs-pk").all_inner_texts())
            await pg.mouse.wheel(0, -4000); await pg.wait_for_timeout(300)
            await pg.locator(".rs-hero .foto-btn").click(); await pg.wait_for_timeout(500)
            await pg.screenshot(path=str(D / f"{u}_fotobesar.png"))
            await c.close()
        print("ERR", errs); await b.close()
asyncio.run(main())
