import asyncio, subprocess, json, os
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8794", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8794/index.html"; O = "/tmp/ui"; FOTO = "/tmp/ttdtest/foto_ttd.jpg"
DB = "JSON.parse(localStorage.getItem('muawanahku_demo_v1')||'{}')"

async def keUtama(pg):
    for _ in range(10):
        if await pg.locator(".bnav").count(): return
        b = pg.locator(".sub-h .back")
        if not await b.count(): return
        await b.first.click(); await pg.wait_for_timeout(220)

async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, accept_downloads=True, has_touch=False)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00")
        await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(500)
        async def login(u):
            await pg.goto(U); await pg.wait_for_timeout(500)
            if await pg.locator(".bnav").count():
                await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row.out").click(); await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        async def akunTtd():
            await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300)
            await pg.locator(".menu-row:has-text('Tanda Tangan')").click(); await pg.wait_for_timeout(400)
        # 1) Wadir Kesantrian menulis tanda tangan di layar (mode diputar mendatar)
        await login("yudistira"); await akunTtd(); await pg.screenshot(path=f"{O}/t1_kosong.png")
        await pg.click("text=Tulis di layar"); await pg.wait_for_timeout(500)
        notes.append(("pad putar", await pg.locator(".pad-box.putar").count()))
        r = await pg.locator(".pad-area canvas").bounding_box()
        cx, cy = r["x"] + r["width"] / 2, r["y"] + r["height"] / 2
        # goresan: di layar tegak yang diputar, sumbu x tanda tangan = sumbu y layar
        import math
        await pg.mouse.move(cx + 60, cy - 220); await pg.mouse.down()
        for i in range(60):
            t = i / 59; await pg.mouse.move(cx + 60 - 90 * math.sin(t * 8) * (1 - t * .4), cy - 220 + 440 * t, steps=2)
        await pg.mouse.up()
        await pg.mouse.move(cx - 20, cy - 160); await pg.mouse.down(); await pg.mouse.move(cx + 40, cy + 170, steps=12); await pg.mouse.up()
        await pg.screenshot(path=f"{O}/t2_pad.png")
        await pg.click(".pad-ok"); await pg.wait_for_timeout(800)
        t = await pg.evaluate(f"(({DB}).ttd||{{}}).yudistira")
        notes.append(("ttd tulis", bool(t and t["img"].startswith("data:image/png")), t and t["w"], t and t["h"], t and len(t["img"])))
        await pg.screenshot(path=f"{O}/t3_tersimpan.png")
        # 2) Foto dari kertas → latar dihapus
        await pg.locator("input[type=file][capture]").set_input_files(FOTO); await pg.wait_for_timeout(2500)
        notes.append(("foto hasil", await pg.locator(".pad-area.foto img").count()))
        await pg.screenshot(path=f"{O}/t4_foto.png")
        await pg.locator(".pad-slide input").fill("0.9"); await pg.wait_for_timeout(700); await pg.screenshot(path=f"{O}/t4b_foto_peka.png")
        await pg.locator(".pad-slide input").fill("0.8"); await pg.wait_for_timeout(500)
        await pg.click(".pad-ok"); await pg.wait_for_timeout(900)
        t = await pg.evaluate(f"(({DB}).ttd||{{}}).yudistira")
        notes.append(("ttd foto", t["cara"], t["w"], t["h"], len(t["img"])))
        open(f"{O}/ttd_foto.png", "wb").write(__import__("base64").b64decode(t["img"].split(",")[1]))
        # 3) Surat izin memakai tanda tangan Wadir Kesantrian
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(300); await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(400)
        await pg.locator(".tile:has-text('Surat Izin')").first.click(); await pg.wait_for_timeout(400)
        await pg.locator("button.pick").click(); await pg.wait_for_timeout(200); await pg.locator(".sheet .row").first.click()
        await pg.fill("textarea", "Acara keluarga"); await pg.click("text=Simpan surat izin"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(700)
        await pg.locator(".btn:has-text('surat')").first.click(); await pg.wait_for_timeout(1500)
        fr = pg.frame_locator("iframe").first
        notes.append(("surat ttd img", await fr.locator(".ttd .sp img").count() if await pg.locator("iframe").count() else "no iframe"))
        await pg.screenshot(path=f"{O}/t5_surat.png", full_page=True)
        async with pg.expect_download(timeout=60000) as dl:
            await pg.locator("button:has-text('Unduh PDF')").first.click()
        d = await dl.value; await d.save_as(f"{O}/surat_ttd.pdf")
        # 4) Mudir menyimpan tanda tangan → rapor; Admin atur nomor WhatsApp
        await login("khanza"); await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300)
        notes.append(("admin punya menu ttd", await pg.locator(".menu-row:has-text('Tanda Tangan')").count()))
        await pg.locator(".menu-row:has-text('Bantuan')").click(); await pg.wait_for_timeout(400)
        await (pg.locator(".wa-card .link") if await pg.locator(".wa-card .link").count() else pg.locator("button.wa-h")).click(); await pg.wait_for_timeout(300)
        await pg.fill(".sheet input[type=tel]", "0812-3456-7890"); await pg.click("text=Simpan kontak"); await pg.wait_for_timeout(600)
        notes.append(("wa link", await pg.locator("a.wa-btn").get_attribute("href")))
        await pg.screenshot(path=f"{O}/t6_bantuan.png")
        await login("syamsul"); await akunTtd()
        await pg.locator("input[type=file]:not([capture])").set_input_files(FOTO); await pg.wait_for_timeout(2500); await pg.click(".pad-ok"); await pg.wait_for_timeout(800)
        notes.append(("mudir ttd", await pg.evaluate(f"!!(({DB}).ttd||{{}}).syamsul")))
        await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300)
        await pg.locator(".menu-row:has-text('Bantuan')").click(); await pg.wait_for_timeout(400)
        notes.append(("wa di akun lain", await pg.locator("a.wa-btn").count(), await pg.locator(".wa-h small").inner_text()))
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(300); await pg.locator(".tile:has-text('Rapor')").first.click(); await pg.wait_for_timeout(500)
        await pg.locator(".row").first.click(); await pg.wait_for_timeout(1200)
        fr = pg.frame_locator("iframe").first
        notes.append(("rapor ttd img", await fr.locator(".qttd-img").count() if await pg.locator("iframe").count() else await pg.locator(".qttd-img").count()))
        await pg.screenshot(path=f"{O}/t7_rapor.png", full_page=True)
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(300)
        await pg.locator(".tile:has-text('Tahfidz')").first.click(); await pg.wait_for_timeout(400); await pg.locator(".tile:has-text('Perolehan Bulanan')").first.click(); await pg.wait_for_timeout(500)
        async with pg.expect_download(timeout=60000) as dl:
            await pg.locator("button:has-text('Unduh PDF')").first.click()
        d = await dl.value; await d.save_as(f"{O}/rekap_ttd.pdf"); notes.append(("rekap pdf", d.suggested_filename))
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False)[:300])
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
