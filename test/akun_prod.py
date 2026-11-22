# Simulasi data akun seperti di database produksi (Admin sudah mengganti nama akun lama):
# ugi → Ust. Hanif (username hanif), habib → Ust. Irul, naufal → Ust. Ugi (username ugi123), santriEdit s059 dengan asrama/halaqah null
import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8787", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8787/index.html"; O = "/tmp/ui"
SEED = {"staffEdit": {
    "habib": {"pendek": "Ust. Irul", "ajar": [], "roles": ["guru_tahfidz", "musyrif"], "username": "irul", "nama": "Ust. Irul"},
    "khanza": {"pendek": "Miss Khansa", "nama": "Khansa Nur Izzati, S.Farm."},
    "naufal": {"pendek": "Ust. Ugi", "ajar": [], "roles": ["guru_tahfidz", "musyrif"], "username": "ugi123", "nama": "Ust. Ugi Abdul Halim Suhul"},
    "ugi": {"username": "hanif", "ajar": [], "roles": ["musyrif", "guru_tahfidz"], "nama": "Ust. Hanif", "pendek": "Ust. Hanif"}},
  "santriEdit": {"s059": {"halaqah": None, "asrama": None, "nama": "Daffa Tsaqib Alzaky Nugraha"}}}

async def main():
    errs, notes = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.set_fixed_time("2026-11-23T08:10:00+07:00")
        await pg.goto(U); await pg.evaluate("localStorage.clear()")
        await pg.evaluate("d => localStorage.setItem('muawanahku_demo_v1', JSON.stringify(d))", SEED); await pg.goto(U); await pg.wait_for_timeout(700)
        demo = [x.split("\n")[1] if "\n" in x else x for x in await pg.locator(".demo-acc").all_inner_texts()]
        notes.append(("portal: jumlah akun Hanif", sum("Hanif" in x for x in demo), "Irul", sum("Irul" in x for x in demo)))
        async def login(u, pw):
            await pg.goto(U); await pg.wait_for_timeout(400)
            if await pg.locator(".bnav").count():
                await pg.locator(".bnav button").nth(4).click(); await pg.wait_for_timeout(300); await pg.locator(".menu-row.out").click(); await pg.locator(".dialog .btn.danger").click(); await pg.wait_for_timeout(400)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", pw); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
        for u, pw in [("hanif", "ugi123"), ("irul", "habib123"), ("ugi123", "naufal123"), ("kaafi", "kaafi123")]:
            await login(u, pw)
            tiles = [x.split("\n")[-1] for x in await pg.locator(".tile").all_inner_texts()]
            await pg.locator(".tile:has-text('Tahfidz')").first.click(); await pg.wait_for_timeout(500)
            notes.append((u, tiles[:4], await pg.locator(".sub-h p, .sub-t p").first.inner_text()))
            if u == "hanif": await pg.screenshot(path=f"{O}/p1_hanif.png")
        await login("khanza", "khanza123")
        await pg.locator(".tile:has-text('Data Master')").first.click(); await pg.wait_for_timeout(400)
        await pg.locator(".tile:has-text('Guru')").first.click(); await pg.wait_for_timeout(500)
        rows = await pg.locator(".row").all_inner_texts()
        notes.append(("admin: baris Hanif", sum("Hanif" in r for r in rows), "baris Irul", sum("Irul" in r for r in rows), "total", len(rows)))
        await b.close()
    for n in notes: print(json.dumps(n, ensure_ascii=False)[:300])
    print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
