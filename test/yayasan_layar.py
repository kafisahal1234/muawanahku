import asyncio, sys
import os; sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
YAYASAN = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K));d.staffEdit=d.staffEdit||{};
 d.staffEdit.yys={id:'yys',nama:'H. Fulan Ketua Yayasan (contoh)',pendek:'H. Fulan',username:'yayasan1',roles:['yayasan'],ajar:[],hp:'',sandiHash:''};localStorage.setItem(K,JSON.stringify(d));return 1}"""
async def main():
    errs=[]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KEGIATAN); await pg.evaluate(YAYASAN); await pg.goto(URL_DIST); await pg.wait_for_timeout(800)
        import hashlib; h=hashlib.sha256(b"yayasan1:yayasan1123").hexdigest()
        await pg.evaluate("h=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K));d.staffEdit.yys.sandiHash=h;localStorage.setItem(K,JSON.stringify(d))}", h)
        await pg.goto(URL_DIST); await pg.wait_for_timeout(800)
        await masuk(pg, "yayasan1")
        await pg.screenshot(path="/tmp/yys1.png", full_page=True)
        await pg.click("text=Semester ini"); await pg.wait_for_timeout(500); await pg.screenshot(path="/tmp/yys2.png", full_page=True)
        print(await pg.locator(".tiles button").all_inner_texts())
        print("ERR", errs); await b.close()
asyncio.run(main())
