import asyncio
from _jalur import DIST, URL_DIST, ADMIN, OUT
from playwright.async_api import async_playwright
URL = URL_DIST

async def keUtama(pg):
    # navigasi bawah hanya tampil di layar utama; kembali dulu bila sedang di layar lanjutan
    for _ in range(10):
        if await pg.locator(".bnav").count(): return
        b = pg.locator(".sub-h .back")
        if not await b.count(): return
        await b.first.click(); await pg.wait_for_timeout(220)

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome"); pg = await b.new_page(reduced_motion="reduce", viewport={"width": 390, "height": 844})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill("input[type=password]", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(400)
        tile = lambda l: pg.locator(f".tile:has(.tile-lb:text-is(\"{l}\"))").first.click()
        await tile("Tahfidz"); await pg.wait_for_timeout(200); await tile("Ziyadah"); await pg.wait_for_timeout(200)
        await pg.locator(".row").first.click(); await pg.wait_for_timeout(200)
        before = await pg.locator(".kv b").first.inner_text()
        await pg.locator(".stepper input").first.fill("30"); await pg.click("text=Simpan setoran"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        # mutabaah 1 hari
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile("Mutaba'ah"); await pg.wait_for_timeout(200)
        for i in range(6): await pg.locator(".check").nth(i).click()
        await pg.click("text=Simpan"); await pg.wait_for_timeout(300)
        # riwayat -> koreksi ziyadah
        await keUtama(pg); await pg.locator(".bnav button").nth(3).click(); await pg.wait_for_timeout(300)
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
        await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(200); await pg.click("text=Log perubahan data"); await pg.wait_for_timeout(300); print("log:", [r.split("\n")[0] for r in await pg.locator(".card .row").all_inner_texts()])
        # rekap mutabaah pekanan & harian
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile("Asrama Saya"); await tile("Rekap Asrama"); await pg.wait_for_timeout(300)
        print("pekanan:", (await pg.locator(".rx-hero").first.inner_text()).replace("\n", " | "))
        await pg.click(".periode .seg button:text-is('Hari ini')"); await pg.wait_for_timeout(200)
        print("harian:", (await pg.locator(".rx-hero").first.inner_text()).replace("\n", " | "))
        await pg.screenshot(path="test/k2_rekap.png")
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile("Kalender"); await pg.wait_for_timeout(300); await pg.screenshot(path="test/k3_kal.png", full_page=True)
        print("errors:", errs); await b.close()
asyncio.run(main())
