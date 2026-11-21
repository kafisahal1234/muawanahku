import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8793", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8793/index.html"
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for ua in [None, IPHONE]:
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, **({"user_agent": ua} if ua else {}))
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill(".pass-in input", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
            await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row:has-text('Bantuan')").click(); await pg.wait_for_timeout(400)
            if not ua: await pg.screenshot(path="/tmp/ui/w0_belum.png")
            await pg.locator("button.wa-h").click(); await pg.wait_for_timeout(400)
            notes.append(("sheet terbuka (wadir)", await pg.locator(".sheet").count()))
            await pg.fill(".sheet input[type=tel]", "0812-3456-7890")
            await pg.locator(".sheet input[type=file]").set_input_files("/tmp/ttdtest/ikon_uji.png"); await pg.wait_for_timeout(500)
            if not ua: await pg.screenshot(path="/tmp/ui/w1_sheet.png")
            await pg.click("text=Simpan kontak"); await pg.wait_for_timeout(600)
            notes.append(("card link", (await pg.locator("a.wa-h").get_attribute("href"))[:40], await pg.locator(".wa-ic.resmi img").count(), await pg.locator(".wa-btn img").count()))
            if not ua: await pg.screenshot(path="/tmp/ui/w2_aktif.png")
            try:
                async with ctx.expect_page(timeout=5000) as np_:
                    await pg.locator("a.wa-h").click()
                np = await np_.value; notes.append(("buka " + ("iphone" if ua else "desktop"), np.url[:60]))
            except Exception as e: notes.append(("buka gagal", str(e)[:120]))
            await ctx.close()
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False))
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
