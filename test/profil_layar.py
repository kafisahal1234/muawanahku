# Menu Tim + profil layar penuh (ustadz & santri), juga dari Daftar Akun Admin → test/out/profil/
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
FOTO = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K)||'{}');const ids=Object.keys(d.santriEdit||{});
 const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,200,200);g.addColorStop(0,'#3a8f62');g.addColorStop(1,'#e2a93b');x.fillStyle=g;x.fillRect(0,0,200,200);x.fillStyle='#fff';x.beginPath();x.arc(100,80,38,0,7);x.fill();x.fillRect(45,130,110,70);
 d.profil=d.profil||{};ids.slice(0,40).forEach(i=>d.profil['s_'+i]={foto:c.toDataURL('image/jpeg',.8)});localStorage.setItem(K,JSON.stringify(d));return ids.length;}"""
D = OUT / "profil"; D.mkdir(exist_ok=True)
YAYASAN = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K));d.staffEdit=d.staffEdit||{};
 d.staffEdit.yys={id:'yys',nama:'H. Fulan Ketua Yayasan (contoh)',pendek:'H. Fulan',username:'yayasan1',roles:['yayasan'],ajar:[],hp:'081200001111'};localStorage.setItem(K,JSON.stringify(d));return 1}"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KEGIATAN); await pg.evaluate(FOTO); await pg.evaluate(YAYASAN); await pg.goto(URL_DIST); await pg.wait_for_timeout(800)
        await masuk(pg, "affan")
        await pg.click(".tiles >> text=Tim"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(D / "tim.png")); print("grup:", await pg.locator(".akun-sec").all_inner_texts())
        await pg.click(".akun-row >> text=Kaafi"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(D / "profil_ustadz.png"), full_page=True)
        await pg.go_back(); await pg.wait_for_timeout(400); await pg.go_back(); await pg.wait_for_timeout(400)
        await pg.click(".fab-tab"); await pg.wait_for_timeout(600)
        await pg.locator(".akun-row").nth(1).click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(D / "profil_santri.png"), full_page=True)
        if await pg.locator(".pf-id .foto-btn").count():
            await pg.locator(".pf-id .foto-btn").click(); await pg.wait_for_timeout(400); await pg.screenshot(path=str(D / "foto_besar.png")); await pg.keyboard.press("Escape")
        await masuk(pg, "admin123", "contoh123")
        await pg.click(".tiles >> text=Daftar Akun"); await pg.wait_for_timeout(600)
        await pg.locator(".akun-row").nth(0).click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(D / "admin_ustadz.png"), full_page=True)
        await pg.go_back(); await pg.wait_for_timeout(400)
        await pg.click("text=Wali Santri ("); await pg.wait_for_timeout(400); await pg.locator(".akun-row").nth(0).click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(D / "admin_santri.png"), full_page=True)
        print("ERR", errs); await b.close()
asyncio.run(main())
