import asyncio, subprocess, json, base64
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8795", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8795/index.html"; O = "/tmp/ui"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGNgYGD4z0AEYBxVSFUAAJ6/AQGG0UPDAAAAAElFTkSuQmCC")
DB = "JSON.parse(localStorage.getItem('muawanahku_demo_v1')||'{}')"

async def keUtama(pg):
    # navigasi bawah hanya tampil di layar utama; kembali dulu bila sedang di layar lanjutan
    for _ in range(10):
        if await pg.locator(".bnav").count(): return
        b = pg.locator(".sub-h .back")
        if not await b.count(): return
        await b.first.click(); await pg.wait_for_timeout(220)

async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def baru():
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, accept_downloads=True)
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00")  # Senin pagi: ada halaqah
            await pg.goto(U); await pg.evaluate("localStorage.clear()"); return pg
        async def login(pg, u):
            await pg.goto(U); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1000)
        async def tile(pg, t): await pg.locator(f".tile:has-text(\"{t}\")").first.click(); await pg.wait_for_timeout(600)
        async def h1(pg): return await pg.locator(".sub-h h1, .sub-t h1").first.inner_text()
        async def tab(pg, t): await keUtama(pg); await pg.locator(f".bnav button:has-text('{t}')").first.click(); await pg.wait_for_timeout(500)
        pg = await baru(); await login(pg, "hanif")
        home = await pg.locator(".tile").all_inner_texts(); notes.append(("home tiles", [x.split("\n")[0] for x in home]))
        notes.append(("rekap tile on home", any(x.split("\n")[0].strip() == "Rekap" for x in home)))
        # ---- Absen halaqah -> tampilan selesai
        await tile(pg, "Tahfidz"); await tile(pg, "Absen Halaqah")
        btn = pg.locator("button:has-text('Simpan absen')")
        notes.append(("absen form", await btn.count()))
        if await btn.count():
            await btn.first.click(); await pg.wait_for_timeout(800)
            notes.append(("after save selesai", await pg.locator(".selesai-card").count()))
            await pg.screenshot(path=f"{O}/d1_absen_selesai.png")
            await pg.go_back(); await pg.wait_for_timeout(500); await tile(pg, "Absen Halaqah")
            notes.append(("reopen selesai/form", await pg.locator(".selesai-card").count(), await pg.locator("button:has-text('Simpan absen')").count()))
            await pg.go_back(); await pg.wait_for_timeout(500)
        # ---- Ziyadah list: belum/sudah
        await tile(pg, "Ziyadah"); await pg.locator(".row").first.click(); await pg.wait_for_timeout(500)
        await pg.locator(".stepper input, input[inputmode=numeric]").first.fill("10"); await pg.wait_for_timeout(200)
        await pg.click("text=Simpan setoran"); await pg.wait_for_timeout(300); await pg.locator(".dialog .btn.primary").last.click(); await pg.wait_for_timeout(900)
        notes.append(("setor sections", await h1(pg), await pg.locator(".card h3, .card-h h3").all_inner_texts()))
        await pg.screenshot(path=f"{O}/d8_setor.png")
        await pg.go_back(); await pg.wait_for_timeout(500)
        # ---- Perolehan bulanan + PDF
        await tile(pg, "Perolehan Bulanan"); notes.append(("hb title", await h1(pg), await pg.locator(".row").count()))
        await pg.screenshot(path=f"{O}/d2_perolehan.png")
        async with pg.expect_download(timeout=60000) as dl:
            await pg.locator("button:has-text('Unduh PDF')").click()
        d = await dl.value; await d.save_as(f"{O}/perolehan.pdf"); notes.append(("hb pdf", d.suggested_filename))
        await pg.go_back(); await pg.wait_for_timeout(500)
        await tile(pg, "Rekap Halaqah"); notes.append(("rekap tahfidz", await h1(pg), await pg.locator(".rk-tabs").count())); await pg.go_back(); await pg.wait_for_timeout(500)
        await pg.go_back(); await pg.wait_for_timeout(500)
        # ---- Asrama Saya: MOTD + Mutabaah
        await tile(pg, "Asrama Saya"); notes.append(("asrama tiles", [x.split("\n")[0] for x in await pg.locator(".tile").all_inner_texts()]))
        await pg.screenshot(path=f"{O}/d3_asrama.png")
        await tile(pg, "Absen MOTD")
        mb = pg.locator(".sticky-act button").first; notes.append(("motd btn", await mb.inner_text()))
        await mb.click(); await pg.wait_for_timeout(800)
        notes.append(("motd selesai", await pg.locator(".selesai-card").count())); await pg.screenshot(path=f"{O}/d4_motd_selesai.png")
        await pg.go_back(); await pg.wait_for_timeout(500)
        await tile(pg, "Mutaba'ah"); await pg.locator(".sticky-act button").first.click(); await pg.wait_for_timeout(800)
        notes.append(("mut after save sub", (await pg.locator(".sub-h small, .sub-t p, .sub-t small").first.inner_text())[:80]))
        await pg.go_back(); await pg.wait_for_timeout(500)
        await tile(pg, "Rekap Asrama"); notes.append(("rekap asrama", await h1(pg), await pg.locator(".rk-tabs button").all_inner_texts())); await pg.go_back(); await pg.wait_for_timeout(500)
        # ---- Riwayat & Koreksi -> ubah MOTD
        await tile(pg, "Riwayat & Koreksi"); await pg.wait_for_timeout(300)
        r = pg.locator(".row:has-text('MOTD')").first
        if await r.count():
            await r.click(); await pg.wait_for_timeout(300); await pg.locator(".sheet button:has-text('Ubah')").click(); await pg.wait_for_timeout(700)
            notes.append(("koreksi motd title", await h1(pg), await pg.locator(".selesai-card").count()))
            await pg.locator(".sticky-act button").first.click(); await pg.wait_for_timeout(800); notes.append(("after koreksi back to", await h1(pg)))
        else: notes.append(("riwayat rows", await pg.locator(".row").all_inner_texts()))
        # ---- Profil: foto tetap ada setelah ubah nama; foto bisa diperbesar
        await tab(pg, "Akun"); await pg.locator(".menu-row:has-text('Profil')").first.click(); await pg.wait_for_timeout(500)
        await pg.locator(".foto-edit input[type=file]").first.set_input_files({"name": "f.png", "mimeType": "image/png", "buffer": PNG}); await pg.wait_for_timeout(1500)
        notes.append(("foto saved", await pg.evaluate(f"!!({DB}.profil||{{}}).hanif?.foto")))
        await pg.click("text=Ubah profil"); await pg.wait_for_timeout(400)
        await pg.locator(".form-page input.in").first.fill("Ust. Hanif Test"); await pg.click("text=Simpan profil"); await pg.wait_for_timeout(800)
        notes.append(("foto after name edit", await pg.evaluate(f"!!({DB}.profil||{{}}).hanif?.foto")))
        await pg.locator(".foto-btn").first.click(); await pg.wait_for_timeout(400)
        notes.append(("lightbox", await pg.locator(".foto-lb img").count())); await pg.screenshot(path=f"{O}/d5_lightbox.png")
        await pg.locator(".lb-x").click(); await pg.wait_for_timeout(300); notes.append(("lightbox closed", await pg.locator(".foto-lb").count()))
        await pg.go_back(); await pg.wait_for_timeout(500)
        await pg.locator(".menu-row:has-text('Log perubahan')").click(); await pg.wait_for_timeout(500)
        notes.append(("log own", await pg.locator(".row").all_inner_texts())); await pg.screenshot(path=f"{O}/d6_log.png")
        # ---- Wali: isi biodata sendiri, kode akses tetap
        pg = await baru()
        await pg.locator(".seg button:has-text('Wali Santri')").click(); await pg.fill(".login input.in", "faeyzamasril08062012"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        await tab(pg, "Akun"); await pg.locator(".menu-row:has-text('Profil Ananda')").click(); await pg.wait_for_timeout(500)
        notes.append(("wali kode", await pg.locator(".kv:has-text('Kode akses') b").inner_text()))
        await pg.click("text=Ubah biodata ananda"); await pg.wait_for_timeout(400)
        await pg.locator(".form-page input[type=date]").fill("2012-03-15"); await pg.locator(".form-page input.in >> nth=1").fill("Eyza")
        await pg.locator(".form-page input[type=tel]").fill("081234567890"); await pg.click("text=Simpan biodata"); await pg.wait_for_timeout(800)
        notes.append(("wali bio", (await pg.locator(".kv-card").nth(1).inner_text()).replace("\n", " | ")[:220]))
        await pg.screenshot(path=f"{O}/d7_wali_bio.png")
        await pg.go_back(); await pg.wait_for_timeout(400); await pg.locator(".menu-row.out").click(); await pg.wait_for_timeout(300)
        await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(600)
        await pg.locator(".seg button:has-text('Wali Santri')").click(); await pg.fill(".login input.in", "faeyzamasril08062012"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        notes.append(("relogin old code", await pg.locator(".bnav").count(), await pg.locator(".note.red, .err").all_inner_texts()))
        await b.close()
    [print(json.dumps(n, ensure_ascii=False)[:320]) for n in notes]; print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
