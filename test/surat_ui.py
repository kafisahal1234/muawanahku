import asyncio, subprocess
from _jalur import DIST, URL_DIST, ADMIN, OUT
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8791", "-d", DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8791/index.html"; O = "/tmp/ui"
async def login(pg, u, p=None):
    await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", p or u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(900)
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome")
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(600)
        await login(pg, "yudistira")
        await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(400)
        # izin form: tidak ada kolom HP
        await pg.locator(".tile:has-text('Surat Izin')").first.click(); await pg.wait_for_timeout(400)
        assert await pg.locator("text=No. HP penjemput").count() == 0, "kolom HP masih ada"
        await pg.click(".pick"); await pg.locator(".sheet .row").first.click(); await pg.wait_for_timeout(200)
        await pg.fill("textarea", "Menghadiri pernikahan kakak"); await pg.locator("input[placeholder^='Nama dan hubungan']").fill("Bapak Masril (ayah)")
        await pg.click("text=Simpan surat izin"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=f"{O}/1_izinview.png")
        await pg.click("text=Lihat & cetak surat izin"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f"{O}/2_suratizin.png")
        await pg.go_back(); await pg.go_back(); await pg.wait_for_timeout(400)
        await pg.goto(U); await pg.wait_for_timeout(700)
        await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(300)
        await pg.locator(".tile:has-text('Form BAP')").first.click(); await pg.wait_for_timeout(400)
        await pg.click(".pick"); await pg.locator(".sheet .row").nth(2).click(); await pg.wait_for_timeout(200)
        await pg.select_option("select", "p8"); await pg.wait_for_timeout(200)
        await pg.fill("textarea >> nth=0", "Santri kedapatan merokok di belakang dapur pada pukul 16.10.")
        await pg.locator(".card:has-text('Tindakan')").last.screenshot(path=f"{O}/3_tindakan.png")
        val = await pg.locator("select >> nth=1").input_value(); print("tindakan default:", val)
        await pg.click("text=Simpan BAP"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{O}/4_bapview.png")
        n = await pg.locator(".card:has-text('Surat otomatis') .row").count(); print("surat otomatis:", n)
        await pg.locator(".card:has-text('Surat otomatis') .row:has-text('Skorsing')").click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f"{O}/5_skorsing.png")
        await pg.goto(U); await pg.wait_for_timeout(700)
        await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{O}/6_kesantrian.png", full_page=True)
        # wali santri ke-3 (s003) melihat surat
        data = await pg.evaluate("localStorage.getItem('muawanahku_demo_v1')")
        ctx2 = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = await ctx2.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(U); await pg.evaluate("d=>{localStorage.clear();localStorage.setItem('muawanahku_demo_v1',d)}", data); await pg.goto(U); await pg.wait_for_timeout(700)
        await pg.click("button:text-is('Wali Santri')"); await pg.locator("form input").first.fill("fadoli22082012"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f"{O}/7_wali_home.png")
        await pg.locator("text=Skorsing").first.click(); await pg.wait_for_timeout(500); await pg.screenshot(path=f"{O}/8_wali_izin.png")
        await b.close()
    print("errors:", errs)
asyncio.run(main()); srv.terminate()
