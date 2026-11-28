# Akun Yayasan (menu garis besar per pondok) + tab bawah per peran → test/out/yayasan/
import asyncio, sys, os, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
D = OUT / "yayasan"; D.mkdir(exist_ok=True)
H = hashlib.sha256(b"yayasan1:yayasan1123").hexdigest()
YAYASAN = """h=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K));d.staffEdit=d.staffEdit||{};
 d.staffEdit.yys={id:'yys',nama:'H. Fulan Ketua Yayasan (contoh)',pendek:'H. Fulan',username:'yayasan1',roles:['yayasan'],ajar:[],hp:'',sandiHash:h};localStorage.setItem(K,JSON.stringify(d));return 1}"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KEGIATAN); await pg.evaluate(YAYASAN, H); await pg.goto(URL_DIST); await pg.wait_for_timeout(800)
        for u, pw in [("yayasan1", None), ("syamsul", None), ("hidayat", None), ("kaafi", None), ("affan", None), ("admin123", "contoh123")]:
            await masuk(pg, u, pw); print(u, "→", await pg.locator(".bnav button em").all_inner_texts())
            if u == "yayasan1":
                await pg.screenshot(path=str(D / "beranda.png"))
                for t, f in [("Tahfidz", "tahfidz"), ("Kurikulum", "kurikulum"), ("Kesantrian", "kesantrian"), ("Ustadz & Guru", "sdm")]:
                    await pg.click(f".tiles >> text={t}"); await pg.wait_for_timeout(700); await pg.screenshot(path=str(D / f"{f}.png"), full_page=True)
                    await pg.click("text=Semester ini"); await pg.wait_for_timeout(400); await pg.go_back(); await pg.wait_for_timeout(400)
                await pg.locator(".bnav button").nth(3).click(); await pg.wait_for_timeout(500); await pg.screenshot(path=str(D / "tab_kalender.png"))
            if u == "admin123":
                await pg.locator(".bnav button").nth(1).click(); await pg.wait_for_timeout(500); await pg.screenshot(path=str(D / "admin_tab2.png"))
        print("ERR", errs); await b.close()
asyncio.run(main())
