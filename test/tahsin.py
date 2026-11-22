import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8788", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8788/index.html"; O = "/tmp/ui"
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
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, accept_downloads=True)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00")
        await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(500)
        async def login(u):
            await pg.goto(U); await pg.wait_for_timeout(500)
            if await pg.locator(".bnav").count():
                await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row.out").click(); await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        async def tile(t): await pg.locator(f".tile:has-text(\"{t}\")").first.click(); await pg.wait_for_timeout(500)
        # 1) Ust. Affan (Ahmad Dahlan): daftar tahsin & bacaan
        await login("affan"); await tile("Tahfidz")
        notes.append(("tile tahfidz", [x.split("\n")[0] for x in await pg.locator(".tile").all_inner_texts()]))
        await pg.screenshot(path=f"{O}/q0_tahfidz.png")
        await tile("Tahsin (Iqro')"); notes.append(("tahsin rows", await pg.locator(".row").count(), await pg.locator(".iq-ringkas b").all_inner_texts()))
        await pg.screenshot(path=f"{O}/q1_list.png", full_page=True)
        await pg.locator(".row:has-text('Aska Alansyah')").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{O}/q2_form.png", full_page=True)
        await pg.locator(".stepper input").nth(1).fill("6"); await pg.click("text=Simpan bacaan"); await pg.wait_for_timeout(700)
        notes.append(("aska", await pg.evaluate(f"Object.values(({DB}).tahsin||{{}}).map(r=>[r.jilid,r.dari,r.sampai,r.nilai])")))
        # Ragil: belum diatur → atur posisi
        await pg.locator(".row:has-text('Ragil')").click(); await pg.wait_for_timeout(400)
        await pg.click("text=Simpan bacaan"); await pg.wait_for_timeout(300)
        await pg.click("text=Atur posisi / tingkat"); await pg.wait_for_timeout(300)
        await pg.locator(".sheet .iq-pilih button:has-text(\"Iqro' 2\")").click(); await pg.locator(".sheet .stepper input").fill("10"); await pg.click("text=Simpan posisi"); await pg.wait_for_timeout(500)
        notes.append(("ragil kepala", await pg.locator(".iq-kepala").inner_text()))
        await pg.go_back(); await pg.wait_for_timeout(400)
        notes.append(("sudah/belum", await pg.locator(".card h3, .card-h h3").all_inner_texts()))
        # ziyadah: santri iqro dipisah
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(300); await tile("Tahfidz"); await tile("Ziyadah")
        notes.append(("ziyadah sections", await pg.locator(".card h3, .card-h h3").all_inner_texts()))
        await pg.screenshot(path=f"{O}/q3_ziyadah.png", full_page=True)
        # 2) Ust. Naufal: ujian Istiqlal (Iqro' 6) lulus → Al-Qur'an; Raffa (Iqro' 4) → Iqro' 5
        await login("naufal"); await tile("Tahfidz"); await tile("Tahsin (Iqro')")
        await pg.locator(".row:has-text('Istiqlal')").click(); await pg.wait_for_timeout(400)
        notes.append(("mode awal", await pg.locator(".seg button.on").first.inner_text()))
        await pg.screenshot(path=f"{O}/q4_ujian.png", full_page=True)
        await pg.click("text=Simpan hasil ujian"); await pg.wait_for_timeout(600)
        await pg.locator(".row:has-text('Raffa Maulana')").click(); await pg.wait_for_timeout(400); await pg.click("text=Simpan hasil ujian"); await pg.wait_for_timeout(600)
        await pg.locator(".row:has-text('Daffa Satya')").click(); await pg.wait_for_timeout(400); await pg.click("text=Belum lulus"); await pg.click("text=Simpan hasil ujian"); await pg.wait_for_timeout(600)
        notes.append(("setelah ujian", await pg.locator(".row").all_inner_texts()))
        # riwayat & koreksi
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(300); await tile("Tahfidz"); await tile("Riwayat & Koreksi")
        notes.append(("riwayat", [x.replace("\n", " | ")[:70] for x in (await pg.locator(".row").all_inner_texts())[:3]]))
        await pg.locator(".row:has-text('Ujian Iqro')").first.click(); await pg.wait_for_timeout(300); await pg.locator(".sheet button:has-text('Ubah')").click(); await pg.wait_for_timeout(500)
        notes.append(("koreksi title", await pg.locator(".sub-h h1, .sub-t h1").first.inner_text()))
        # 3) Wadir Tahfidz: rekap tahsin + PDF
        await login("hidayat"); await tile("Pengelolaan"); await tile("Rekap Tahsin")
        notes.append(("rekap", await pg.locator(".iq-ringkas b").all_inner_texts(), await pg.locator(".card").count()))
        await pg.screenshot(path=f"{O}/q5_rekap.png")
        async with pg.expect_download(timeout=60000) as dl:
            await pg.click("text=Unduh rekap tahsin (PDF)")
        d = await dl.value; await d.save_as(f"{O}/rekap_tahsin.pdf"); notes.append(("pdf", d.suggested_filename))
        # 4) Wali Aska: kartu hafalan + tahsin
        await pg.goto(U); await pg.wait_for_timeout(400)
        await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row.out").click(); await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(500)
        await pg.locator(".seg button:has-text('Wali Santri')").click(); await pg.fill(".login input.in", "aska15032013"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(2500)
        notes.append(("wali hero", (await pg.locator(".hf").inner_text()).replace("\n", " | ")[:220]))
        await pg.screenshot(path=f"{O}/q6_wali.png")
        # 5) Wali Affan: hafalan baru 9 juz
        await keUtama(pg); await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row.out").click(); await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(500)
        await pg.locator(".seg button:has-text('Wali Santri')").click(); await pg.fill(".login input.in", "affanabdillah08102011"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(2500)
        notes.append(("affan", (await pg.locator(".hf-big").inner_text()).replace("\n", " ")))
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False)[:400])
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
