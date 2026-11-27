import asyncio, json, random
from _jalur import DIST, URL_DIST, ADMIN, OUT
from playwright.async_api import async_playwright
URL = URL_DIST
SID = "s056"  # Adiyatma, kelas 9A, asrama a7 (Ust. Kafi)
random.seed(3)
def seed():
    d = {c: {} for c in ["setoran","absenHalaqah","motd","mutabaah","izin","bap","absenKelas","nilaiMapel","nilaiTahfidz","jadwal","izinGuru","pengumuman","dataAwal","santriEdit","target","akun","hapusAkun","raporCatatan"]}
    smt = {f"30:{i}": random.randint(80, 98) for i in range(78, 115)}
    smt.update({f"29:{i}": random.randint(75, 95) for i in range(67, 78)}); smt["j1"] = 88
    mid = {f"30:{i}": random.randint(78, 96) for i in range(78, 115)}
    d["nilaiTahfidz"][SID] = {"santri": SID, "mid": mid, "smt": smt}
    d["santriEdit"][SID] = {"nis": "2024.09.056"}
    for day in range(1, 29):
        ib = [i for i in range(20) if random.random() < (0.95 if i < 10 else 0.7)]
        ad = [i for i in range(15) if random.random() < 0.9]
        d["mutabaah"][f"{SID}_2026-11-{day:02d}"] = {"santri": SID, "tanggal": f"2026-11-{day:02d}", "ibadah": ib, "adab": ad}
    for m, k, g in [("fiqih","9A","izzudin"),("karakter","9A","jazulis"),("bing","9A","ridho")]:
        d["nilaiMapel"][f"{m}_{k}"] = {"mapel": m, "kelas": k, "projek": {SID: 85}, "pts": {SID: 80}, "pas": {SID: 88}, "aspek": {SID: {"0": 86, "1": 90, "2": 92, "3": 84, "4": 80}}, "guru": g}
    for i, (ses, st) in enumerate([("Shubuh","H"),("Dhuha","H"),("Malam","S"),("Shubuh","H"),("Dhuha","I"),("Malam","H")]):
        d["absenHalaqah"][f"h7_2026-11-{i+2:02d}_{ses}"] = {"halaqah": "h7", "tanggal": f"2026-11-{i+2:02d}", "sesi": ses, "status": {SID: st}}
    for i, b in enumerate([60, 95, 130, 172, 215]):
        d["setoran"][f"z{i}"] = {"santri": SID, "jenis": "ziyadah", "tanggal": f"2026-11-{i+3:02d}", "juz": 2, "sebelum": b - 35, "sesudah": b, "lulus": True, "ts": 1790000000000 + i}
    return d

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
        ctx = await b.new_context(reduced_motion="reduce", viewport={"width": 400, "height": 860}, accept_downloads=True)
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL); key = await pg.evaluate("Object.keys(localStorage)")
        await pg.evaluate(f"localStorage.clear(); localStorage.setItem({json.dumps(LSKEY)}, {json.dumps(json.dumps(seed()))})")
        await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.fill("input[autocomplete=username]", "kaafi"); await pg.fill("input[type=password]", "kaafi123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(400)
        # nilai IT per aspek lewat UI
        await pg.locator(".tile:has(.tile-lb:text-is('Mapel IT'))").first.click(); await pg.wait_for_timeout(250)
        await pg.locator(".tile:has(.tile-lb:has-text('Nilai'))").first.click(); await pg.wait_for_timeout(250)
        await pg.locator(".row:has-text('Kelas 9A')").first.click(); await pg.wait_for_timeout(250)
        await pg.locator(".tbl input").first.fill("90")
        await pg.click("text=PTS & PAS"); await pg.wait_for_timeout(150)
        await pg.locator("input[aria-label='PTS Adiyatma Wiryateja']").fill("84"); await pg.locator("input[aria-label='PAS Adiyatma Wiryateja']").fill("92")
        await pg.click("text=Aspek rapor"); await pg.wait_for_timeout(150)
        for i, v in enumerate([88, 93, 95, 90]):
            await pg.locator(f"input[aria-label='{['Pengetahuan (Kognitif)','Keterampilan (Psikomotorik)','Sikap dan Karakter (Afektif)','Project IT'][i]} Adiyatma Wiryateja']").fill(str(v))
        await pg.screenshot(path="test/r1_aspek.png", full_page=False)
        await pg.click("text=Simpan nilai"); await pg.wait_for_timeout(300)
        await keUtama(pg); await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200)
        await pg.locator(".tile:has(.tile-lb:text-is('Rapor'))").first.click(); await pg.wait_for_timeout(250)
        await pg.locator(".row:has-text('Adiyatma')").first.click(); await pg.wait_for_timeout(400)
        await pg.locator("textarea").fill("Alhamdulillah Ananda Adiyatma rajin murojaah dan disiplin sholat berjamaah. Perlu meningkatkan kelancaran hafalan Juz 2 dan menjaga adab di asrama.")
        await pg.click("text=Simpan catatan"); await pg.wait_for_timeout(300)
        await pg.screenshot(path="test/r2_view.png", full_page=False)
        doc = await pg.evaluate("""() => { const css = [...document.querySelectorAll('style')].map(x=>x.textContent).find(t=>t.includes('.rp-page'));
          return '<!DOCTYPE html><html><head><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap" rel=stylesheet><style>@page{size:A4;margin:0}body{margin:0}' + css + '@media print{.rp-page{margin:0;box-shadow:none;page-break-after:always}}</style></head><body><div class=rp>' + document.querySelector('.rp').innerHTML + '</div></body></html>'; }""")
        open("/tmp/rapor_dl.html", "w").write(doc)
        await pg.screenshot(path="test/r2b_full.png", full_page=True)
        await pg.click("text=Tengah semester"); await pg.wait_for_timeout(200)
        await pg.locator("textarea").fill("Ananda menunjukkan semangat menghafal yang baik. Pertahankan murojaah harian dan tingkatkan ketepatan waktu di halaqah Shubuh.")
        await pg.click("text=Simpan catatan"); await pg.wait_for_timeout(300); await pg.screenshot(path="test/r3_mid.png", full_page=False)
        doc = await pg.evaluate("""() => { const css = [...document.querySelectorAll('style')].map(x=>x.textContent).find(t=>t.includes('.rp-page'));
          return '<!DOCTYPE html><html><head><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap" rel=stylesheet><style>@page{size:A4;margin:0}body{margin:0}' + css + '@media print{.rp-page{margin:0;box-shadow:none;page-break-after:always}}</style></head><body><div class=rp>' + document.querySelector('.rp').innerHTML + '</div></body></html>'; }""")
        open("/tmp/rapor_mid.html", "w").write(doc)
        print("errors:", errs)
        await b.close()
LSKEY = None
import re
LSKEY = re.search(r'LSKEY = "([^"]+)"', open("src/store.js").read()).group(1)
asyncio.run(main())
