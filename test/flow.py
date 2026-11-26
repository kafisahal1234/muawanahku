import asyncio, json
from playwright.async_api import async_playwright
URL = "file:///home/claude/webapp/dist/index.html"
async def login(pg, u, p=None):
    await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL); await pg.wait_for_timeout(300)
    await pg.fill("input[autocomplete=username]", u); await pg.fill("input[type=password]", p or u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(300)
async def loginWali(pg, nama):
    await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL); await pg.wait_for_timeout(300)
    await pg.click("text=Lihat semua akun demo"); await pg.fill(".sheet .search input", nama); await pg.wait_for_timeout(100); await pg.locator(".demo-acc:has(.av.gold)").first.click(); await pg.wait_for_timeout(300)
async def tile(pg, label): await pg.locator(f".tile:has(.tile-lb:text-is(\"{label}\"))").first.click(); await pg.wait_for_timeout(250)

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
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome")
        pg = await b.new_page(reduced_motion="reduce", viewport={"width": 400, "height": 860})
        await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00")
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL); await pg.evaluate("localStorage.clear()")
        await login(pg, "kaafi")
        await tile(pg, "Tahfidz"); await pg.screenshot(path="test/f1_tahfidz.png", full_page=True)
        await tile(pg, "Ziyadah"); await pg.locator(".row").first.click(); await pg.wait_for_timeout(250)
        name = await pg.locator(".card b").first.inner_text()
        await pg.locator(".stepper input").first.fill("50"); await pg.locator(".stepper input").nth(1).fill("2"); await pg.wait_for_timeout(150)
        await pg.screenshot(path="test/f2_ziyadah.png", full_page=True)
        pos = await pg.locator(".pos b").inner_text(); nilai = await pg.locator(".nilai-box b").inner_text()
        print("ziyadah", name, pos, nilai)
        await pg.click("text=Simpan setoran"); await pg.wait_for_timeout(150); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        print("toast:", await pg.locator(".toast").inner_text() if await pg.locator(".toast").count() else None)
        # sampai akhir juz untuk santri kedua
        await pg.locator(".row").nth(1).click(); await pg.wait_for_timeout(250)
        await pg.click("text=Sampai akhir juz"); await pg.wait_for_timeout(100); await pg.click("text=Simpan setoran"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        print("toast2:", await pg.locator(".toast").inner_text() if await pg.locator(".toast").count() else None)
        await pg.locator(".sub-h .back").click(); await pg.wait_for_timeout(200)
        await tile(pg, "Tasmi'"); await pg.screenshot(path="test/f3_tasmi_list.png", full_page=True)
        if await pg.locator(".card .row").count():
            await pg.locator(".card .row").first.click(); await pg.wait_for_timeout(200)
            await pg.locator(".stepper input").first.fill("3"); await pg.click("text=Simpan nilai tasmi'"); await pg.wait_for_timeout(300)
            print("tasmi toast:", await pg.locator(".toast").inner_text() if await pg.locator(".toast").count() else None)
        await pg.locator(".sub-h .back").click(); await pg.wait_for_timeout(200)
        await tile(pg, "Absen Halaqah"); await pg.locator(".stpick").nth(2).locator("button:text-is('S')").click(); await pg.click("text=Simpan absen"); await pg.wait_for_timeout(300)
        print("absen selesai view:", await pg.locator(".selesai-card").count()); await pg.locator(".sub-h .back").click(); await pg.wait_for_timeout(300)
        await tile(pg, "Manzil"); await pg.screenshot(path="test/f4_manzil.png", full_page=True); await pg.locator(".sub-h .back").click()
        # mutabaah + motd
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await tile(pg, "Asrama Saya"); await pg.wait_for_timeout(200)
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await tile(pg, "Mutaba'ah"); await pg.screenshot(path="test/f5_mut.png", full_page=True)
        await pg.click("text=Simpan · santri berikutnya"); await pg.wait_for_timeout(200)
        # kurikulum jadwal bentrok
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await tile(pg, "Kurikulum"); await tile(pg, "Jadwal Mengajar"); await pg.screenshot(path="test/f6_jadwal.png", full_page=True)
        await pg.locator(".grid-j .cell.empty").first.click(); await pg.wait_for_timeout(200)
        await pg.select_option(".sheet select >> nth=0", "it"); await pg.wait_for_timeout(100); await pg.screenshot(path="test/f6b_slot.png")
        await pg.locator(".sheet .icon-btn").click()
        # mapel IT absen
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await tile(pg, "Mapel IT"); await pg.screenshot(path="test/f7_mapel.png", full_page=True)
        await pg.click("text=Absen di luar jadwal"); await pg.locator(".row").first.click(); await pg.wait_for_timeout(200)
        await pg.fill("input[placeholder='Misal: Descriptive text']", "Algoritma dan flowchart"); await pg.click("text=Simpan absen & jurnal"); await pg.wait_for_timeout(300)
        # kesantrian izin by izzudin
        await login(pg, "izzudin"); await tile(pg, "Kesantrian"); await tile(pg, "Surat Izin")
        await pg.locator("button.pick").click(); await pg.fill(".sheet .search input", "sultan abdullah"); await pg.locator(".sheet .row").first.click()
        await pg.fill("textarea", "Walimah kakak"); await pg.click("text=Simpan surat izin"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="test/f8_surat.png", full_page=True)
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await tile(pg, "Kesantrian"); await tile(pg, "Form BAP")
        await pg.locator("button.pick").click(); await pg.fill(".sheet .search input", "davin"); await pg.locator(".sheet .row").first.click()
        await pg.select_option("select.in", "p5"); await pg.fill("textarea >> nth=0", "Ditemukan HP di lemari"); await pg.click("text=Simpan BAP"); await pg.locator(".dialog .btn.primary").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="test/f9_bap.png", full_page=True)
        # mudir announcement
        await login(pg, "syamsul"); await pg.screenshot(path="test/f10_mudir.png", full_page=True); await pg.click(".ab-btn:not(.ab-ai)"); await pg.wait_for_timeout(250)
        await pg.fill("input[placeholder^='Misal: Jadwal']", "Jadwal perpulangan akhir semester"); await pg.fill("textarea", "Perpulangan 20 Desember 2026."); await pg.click("text=Kirim pengumuman"); await pg.wait_for_timeout(300)
        # wali
        await loginWali(pg, "sultan abdullah"); await pg.screenshot(path="test/f11_wali.png", full_page=True)
        await keUtama(pg); await pg.locator(".bnav button").nth(3).click(); await pg.wait_for_timeout(200); await pg.screenshot(path="test/f12_wali_izin.png", full_page=True)
        await loginWali(pg, "davin"); await keUtama(pg); await pg.locator(".bnav button").nth(3).click(); await pg.wait_for_timeout(200); await pg.screenshot(path="test/f13_wali_davin.png", full_page=True)
        # rapor
        await login(pg, "kaafi"); await tile(pg, "Rapor"); await pg.locator(".card .row").first.click(); await pg.wait_for_timeout(200); await pg.screenshot(path="test/f14_rapor.png", full_page=True)
        await b.close()
    print("ERR", errs[:10])
asyncio.run(main())
