import asyncio, subprocess, json
from _jalur import DIST, URL_DIST, ADMIN, OUT
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8794", "-d", DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8794/index.html"; O = "/tmp/ui"
async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome")
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page(); await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00"); pg.on("pageerror", lambda e: errs.append(str(e)))
        cloudhits = []; pg.on("requestfinished", lambda r: ("googleapis" in r.url or "gstatic.com/firebasejs" in r.url) and cloudhits.append(r.url))
        async def bad(w):
            if await pg.locator(".note.red").count(): errs.append((w, await pg.locator(".note.red").first.inner_text()))
        async def login(u):
            await pg.goto(U); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1000)
        async def tile(t): await pg.locator(f".tile:has-text(\"{t}\")").first.click(); await pg.wait_for_timeout(600)
        async def yes(): await pg.locator(".dialog .btn.primary, .dialog .btn.danger").last.click(); await pg.wait_for_timeout(700)
        await pg.goto(U); await pg.evaluate("localStorage.clear()")
        notes.append(("vt class", await pg.evaluate("document.documentElement.className")))
        # ---- Kesantrian: izin ubah & hapus
        await login("yudistira"); await tile("Kesantrian"); await tile("Surat Izin")
        await pg.click(".pick"); await pg.locator(".sheet .row").first.click(); await pg.wait_for_timeout(200)
        await pg.fill("textarea", "Acara keluarga"); await pg.click("text=Simpan surat izin"); await yes()
        await pg.locator("text=Ubah / hapus izin ini").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{O}/k1_sheet.png")
        await pg.locator(".sheet button:has-text('Ubah')").click(); await pg.wait_for_timeout(700)
        notes.append(("izin edit title", await pg.locator(".sub-h h1, .sub-t h1").first.inner_text()))
        await pg.fill("textarea", "Acara keluarga (diperbaiki)"); await pg.click("text=Simpan perubahan"); await yes()
        notes.append(("izin after edit", (await pg.locator(".surat").inner_text())[:160].replace("\n", " | ")))
        await pg.locator("text=Ubah / hapus izin ini").click(); await pg.wait_for_timeout(300)
        await pg.locator(".sheet button:has-text('Hapus')").click(); await pg.wait_for_timeout(300); await yes()
        notes.append(("after izin delete screen", await pg.locator(".sub-h h1, .sub-t h1").first.inner_text()))
        await bad("izin")
        # ---- BAP skorsing -> ubah ke SP-1 -> linked izin hilang -> hapus
        await tile("Form BAP")
        await pg.click(".pick"); await pg.locator(".sheet .row").nth(3).click(); await pg.wait_for_timeout(200)
        await pg.select_option("select >> nth=0", "p8"); await pg.fill("textarea >> nth=0", "Merokok di belakang dapur."); await pg.wait_for_timeout(200)
        await pg.click("text=Simpan BAP"); await yes()
        nz = await pg.evaluate("Object.values(JSON.parse(localStorage.getItem('muawanahku_demo_v1')||'{}').izin||{}).filter(i=>i.jenis==='Skorsing').length"); notes.append(("skorsing izin after create", nz))
        await pg.locator("text=Ubah / hapus BAP ini").click(); await pg.wait_for_timeout(300)
        await pg.locator(".sheet button:has-text('Ubah')").click(); await pg.wait_for_timeout(700)
        await pg.select_option("select >> nth=1", "sp1"); await pg.click("text=Simpan perubahan"); await yes()
        nz = await pg.evaluate("Object.values(JSON.parse(localStorage.getItem('muawanahku_demo_v1')||'{}').izin||{}).filter(i=>i.jenis==='Skorsing').length"); notes.append(("skorsing izin after edit->SP1", nz))
        notes.append(("bap surat list", await pg.locator(".card:has-text('Surat otomatis') .row").all_inner_texts()))
        await pg.locator("text=Ubah / hapus BAP ini").click(); await pg.wait_for_timeout(300)
        await pg.locator(".sheet button:has-text('Hapus')").click(); await pg.wait_for_timeout(300); await yes()
        nb = await pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('muawanahku_demo_v1')||'{}').bap||{}).length"); notes.append(("bap count after delete", nb))
        await tile("Riwayat & Koreksi"); await pg.screenshot(path=f"{O}/k2_riwayat_kes.png"); await bad("riwayat kes")
        # ---- Tahfidz (kaafi): absen -> sudah ada banner -> hapus ; riwayat & koreksi
        ctx2 = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = await ctx2.new_page(); await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00"); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(U); await pg.evaluate("localStorage.clear()"); await login("kaafi")
        await tile("Tahfidz"); await tile("Absen Halaqah")
        if await pg.locator("text=Simpan absen").count():
            await pg.locator("text=Simpan absen").click(); await pg.wait_for_timeout(700)
            notes.append(("selesai view", await pg.locator(".selesai-card").count(), await pg.locator("text=Simpan absen").count()))
            await pg.go_back(); await pg.wait_for_timeout(500)
        await tile("Riwayat & Koreksi"); await bad("riwayat tahfidz")
        await pg.go_back(); await pg.wait_for_timeout(500)
        await tile("Izin Guru"); await pg.fill("textarea", "demam"); await pg.click("text=Simpan izin"); await pg.wait_for_timeout(500)
        await pg.locator(".row:has-text('ketuk untuk ubah')").first.click(); await pg.wait_for_timeout(300)
        await pg.locator(".sheet button:has-text('Ubah')").click(); await pg.wait_for_timeout(600)
        notes.append(("izin guru edit title", await pg.locator(".sub-h h1, .sub-t h1").first.inner_text())); await bad("izin guru")
        # transition mid-frame
        await pg.go_back(); await pg.wait_for_timeout(600); await pg.go_back(); await pg.wait_for_timeout(600)
        await pg.evaluate("setTimeout(()=>{},0)")
        await pg.locator(".tile").first.click(); await pg.wait_for_timeout(120); await pg.screenshot(path=f"{O}/k4_trans.png")
        await pg.wait_for_timeout(500)
        await b.close()
    print(json.dumps(notes, ensure_ascii=False)); print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
