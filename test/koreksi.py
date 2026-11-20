import asyncio
from playwright.async_api import async_playwright
URL = "file:///home/claude/webapp/dist/index.html"
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome"); pg = await b.new_page(viewport={"width": 390, "height": 844})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill("input[type=password]", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(400)
        tile = lambda l: pg.locator(f".tile:has(.tile-lb:text-is(\"{l}\"))").first.click()
        await tile("Tahfidz"); await pg.wait_for_timeout(200); await tile("Ziyadah"); await pg.wait_for_timeout(200)
        await pg.locator(".row").first.click(); await pg.wait_for_timeout(200)
        before = await pg.locator(".kv b").first.inner_text()
        await pg.locator(".stepper input").first.fill("30"); await pg.click("text=Simpan setoran"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        # mutabaah 1 hari
        await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile("Mutaba'ah"); await pg.wait_for_timeout(200)
        for i in range(6): await pg.locator(".check").nth(i).click()
        await pg.click("text=Simpan"); await pg.wait_for_timeout(300)
        # riwayat -> koreksi ziyadah
        await pg.locator(".bnav button").nth(3).click(); await pg.wait_for_timeout(300)
        rows = await pg.locator(".card .row").all_inner_texts(); print("riwayat:", [r.split("\n")[0] for r in rows[:3]])
        await pg.locator(".card .row:has-text('Ziyadah')").first.click(); await pg.wait_for_timeout(200)
        await pg.screenshot(path="test/k1_sheet.png")
        await pg.locator(".sheet .btn:has-text('Ubah')").click(); await pg.wait_for_timeout(300)
        val = await pg.locator(".stepper input").first.input_value(); print("prefill baris:", val, "| title:", await pg.locator(".sub-h h1").inner_text())
        await pg.locator(".stepper input").first.fill("15"); await pg.click("text=Simpan setoran"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        print("toast:", await pg.locator(".toast").inner_text() if await pg.locator(".toast").count() else None)
        await pg.locator(".card .row:has-text('Ziyadah')").first.click(); await pg.wait_for_timeout(200)
        await pg.locator(".sheet .btn:has-text('Hapus')").click(); await pg.wait_for_timeout(150); await pg.locator(".dialog .btn.danger, .dialog .btn:has-text('Hapus')").last.click(); await pg.wait_for_timeout(300)
        print("after delete rows:", [r.split("\n")[0] for r in (await pg.locator(".card .row").all_inner_texts())[:3]])
        await pg.click("text=Log perubahan data"); await pg.wait_for_timeout(300); print("log:", [r.split("\n")[0] for r in await pg.locator(".card .row").all_inner_texts()])
        # rekap mutabaah pekanan & harian
        await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile("Rekap"); await pg.wait_for_timeout(300)
        await pg.click(".sub-h .seg button:text-is(\"Mutaba'ah\")"); await pg.wait_for_timeout(200)
        print("pekanan:", (await pg.locator(".rk").first.inner_text()).replace("\n", " | "))
        await pg.click(".periode .seg button:text-is('Harian')"); await pg.wait_for_timeout(200)
        print("harian:", (await pg.locator(".rk").first.inner_text()).replace("\n", " | "))
        await pg.screenshot(path="test/k2_rekap.png")
        await tile("Kalender") if False else None
        await pg.locator(".sub-h .back").click(); await pg.wait_for_timeout(200); await tile("Kalender"); await pg.wait_for_timeout(300); await pg.screenshot(path="test/k3_kal.png", full_page=True)
        print("errors:", errs); await b.close()
asyncio.run(main())
