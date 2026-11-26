import asyncio
from playwright.async_api import async_playwright
URL = "file:///home/claude/webapp/dist/index.html"
async def login(pg, u):
    await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL); await pg.wait_for_timeout(300)
    await pg.fill("input[autocomplete=username]", u); await pg.fill("input[autocomplete=current-password]", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(400)
async def tile(pg, label): await pg.locator(f".tile:has(.tile-lb:text-is(\"{label}\"))").first.click(); await pg.wait_for_timeout(300)

async def keUtama(pg):
    # navigasi bawah hanya tampil di layar utama; kembali dulu bila sedang di layar lanjutan
    for _ in range(10):
        if await pg.locator(".bnav").count(): return
        b = pg.locator(".sub-h .back")
        if not await b.count(): return
        await b.first.click(); await pg.wait_for_timeout(220)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome")
        pg = await b.new_page(reduced_motion="reduce", viewport={"width": 390, "height": 844}, device_scale_factor=1.5)
        await pg.goto(URL); await pg.wait_for_timeout(2500); await pg.screenshot(path="test/s0_login.png")
        await login(pg, "kaafi"); await pg.wait_for_timeout(2200); await pg.screenshot(path="test/s1_home.png")
        await tile(pg, "Tahfidz"); await pg.screenshot(path="test/s2_tahfidz.png")
        await tile(pg, "Absen Halaqah"); await pg.screenshot(path="test/s3_absen.png")
        await pg.locator(".sub-h .back").click(); await pg.wait_for_timeout(200)
        await tile(pg, "Ziyadah"); await pg.locator(".row").first.click(); await pg.wait_for_timeout(300); await pg.screenshot(path="test/s4_ziyadah.png")
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200)
        await tile(pg, "MOTD"); await pg.screenshot(path="test/s5_motd.png")
        await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.screenshot(path="test/s6_akun.png")
        await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click("text=Lihat semua akun demo"); await pg.fill(".sheet .search input", "adiyatma"); await pg.locator(".demo-acc:has(.av.gold)").first.click(); await pg.wait_for_timeout(600); await pg.screenshot(path="test/s7_wali.png")
        await b.close()
asyncio.run(main())
