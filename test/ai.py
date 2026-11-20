import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8765", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
URL = "http://localhost:8765/index.html"
MOCK = r"""
window.__AI_LOG = [];
window.__AI_MOCK = async ({ teks, sistem, berkas, json }) => {
  window.__AI_LOG.push({ teks, sistem, nb: berkas.length, json });
  if (/dokumen nilai mapel/.test(teks)) return { projek_nama: ["Poster Wudhu", "Video"], baris: [{ nama: "Adiyatma W", santri_id: null, projek: [88, 90], pts: 75, pas: 8.5, aspek: [80, 81, 82, 83] }, { nama: "Affan Abdilah", santri_id: null, projek: [70, null], pts: 66, pas: 72, aspek: [] }, { nama: "Orang Lain", projek: [1] }] };
  if (/jadwal pelajaran/.test(teks)) return { jadwal: [{ hari: "Senin", jam: "j1", kelas: "7", mapel: "fiqih", guru: null }, { hari: "Selasa", jam: "j2", kelas: "9A", mapel: "it", guru: "kaafi" }, { hari: "Rabu", jam: "j1", kelas: "8", mapel: "olahraga", guru: null }] };
  if (/Asisten MuawanahKu/.test(sistem || "")) return "Jawaban asisten: **3 santri** perlu perhatian.\n- Faeyza\n- Fatih";
  await new Promise(r => setTimeout(r, 150));
  if (/data hafalan Al-Qur'an/.test(teks)) return { baris: [
    { nama: "Faeyza Masril", santri_id: "s001", juz_selesai: [30, 29, 1, 2], juz_aktif: 3, halaman_aktif: 5 },
    { nama: "M Fatih Machali S.", santri_id: "s002", juz_selesai: [], jumlah_juz: 4.5 },
    { nama: "Budi Tidakada", santri_id: null, jumlah_juz: 1, catatan: "Tidak ada di daftar" } ] };
  if (/data santri di bawah/.test(teks)) return { baris: [
    { nama: "Muhammad Dwino Alkadhafy", santri_id: "s005", tanggal_lahir: "2012-02-14", tempat_lahir: "Metro", ayah: "Pak Dwi", hp_wali: "081234567890" },
    { nama: "Ahmad Santri Baru", santri_id: null, tanggal_lahir: "3 Maret 2013", tempat_lahir: "Bandar Lampung", ayah: "Pak Ahmad", kelas: "7", asrama: "Teuku Umar" } ] };
  if (json) return { judul: "Perpulangan Akhir Semester", isi: "Assalamu'alaikum.\n- Tanggal 20 Desember\n- Jemput pukul 08.00", kronologi: "Santri kedapatan membawa HP di kamar.", pelanggaran_id: null };
  return "Alhamdulillah **hafalan lancar**.\n- Perlu menambah murojaah\n- Jaga kehadiran";
};
"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        async def page(mock=True):
            pg = await b.new_page(reduced_motion="reduce", viewport={"width": 390, "height": 844})
            pg.on("pageerror", lambda e: errs.append(str(e)))
            if mock: await pg.add_init_script(MOCK)
            await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(400)
            return pg
        async def login(pg, u):
            await pg.fill("input[autocomplete=username]", u); await pg.fill("input[type=password]", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(500)
        tile = lambda pg, l: pg.locator(f".tile:has(.tile-lb:text-is(\"{l}\"))").first.click()

        # 1) Data Awal dari Excel berantakan (AI)
        pg = await page(); await login(pg, "hidayat")
        print("tiles hidayat:", await pg.locator(".tile-lb").all_inner_texts())
        await tile(pg, "Pengelolaan Tahfidz"); await pg.wait_for_timeout(300); await tile(pg, "Data Awal Hafalan"); await pg.wait_for_timeout(300)
        await pg.click(".up-cta"); await pg.wait_for_timeout(300)
        await pg.set_input_files("input[type=file]", "/tmp/aidoc/awal.xlsx"); await pg.wait_for_selector(".imp-row", timeout=20000)
        log = await pg.evaluate("window.__AI_LOG"); print("AI melihat isi excel:", "Faeyza Masril" in log[-1]["teks"] and "sedang juz 3 hal 5" in log[-1]["teks"])
        print("pratinjau:", [t.replace("\n", " | ") for t in await pg.locator(".imp-row").all_inner_texts()])
        await pg.screenshot(path="test/ai1_awal.png", full_page=True)
        await pg.click(".sticky-act .btn:has-text('Simpan')"); await pg.wait_for_timeout(500)
        print("setelah simpan:", [t.split("\n")[1] for t in (await pg.locator(".card .row").all_inner_texts())[:0]] or (await pg.locator(".toast").all_inner_texts()))
        d = await pg.evaluate("JSON.parse(localStorage.getItem('muawanahku_demo_v1')).dataAwal"); print("dataAwal:", json.dumps(d))
        await pg.close()

        # 2) tanpa AI: CSV rapi
        pg = await page(mock=False); await login(pg, "hidayat")
        await tile(pg, "Pengelolaan Tahfidz"); await pg.wait_for_timeout(300); await tile(pg, "Data Awal Hafalan"); await pg.wait_for_timeout(300); await pg.click(".up-cta"); await pg.wait_for_timeout(300)
        await pg.set_input_files("input[type=file]", "/tmp/aidoc/awal.csv"); await pg.wait_for_selector(".imp-row", timeout=20000)
        print("tanpa AI:", [t.replace("\n", " | ") for t in await pg.locator(".imp-row").all_inner_texts()])
        await pg.close()

        # 3) Impor santri dari Word + PDF (admin)
        pg = await page(); await login(pg, "khanza")
        print("tiles khanza:", await pg.locator(".tile-lb").all_inner_texts())
        await tile(pg, "Data Master"); await pg.wait_for_timeout(300); await tile(pg, "Impor Data"); await pg.wait_for_timeout(300)
        await pg.set_input_files("input[type=file]", "/tmp/aidoc/santri.docx"); await pg.wait_for_selector(".imp-row", timeout=20000)
        log = await pg.evaluate("window.__AI_LOG"); print("AI melihat isi Word:", "Metro, 14 Februari 2012" in log[-1]["teks"])
        print("pratinjau santri:", [t.replace("\n", " | ") for t in await pg.locator(".imp-row").all_inner_texts()])
        await pg.screenshot(path="test/ai2_santri.png", full_page=True)
        await pg.click(".sticky-act .btn:has-text('Simpan')"); await pg.wait_for_timeout(600)
        se = await pg.evaluate("JSON.parse(localStorage.getItem('muawanahku_demo_v1')).santriEdit"); print("santriEdit:", json.dumps(se)[:400])
        await tile(pg, "Impor Data"); await pg.wait_for_timeout(300)
        await pg.set_input_files("input[type=file]", "/tmp/aidoc/santri.pdf"); await pg.wait_for_selector(".imp-row", timeout=30000)
        log = await pg.evaluate("window.__AI_LOG"); print("AI melihat teks PDF:", "Gaza Al Faqih" in log[-1]["teks"], "| lampiran:", log[-1]["nb"])
        await pg.close()

        # 4) Tombol AI lain: pengumuman (admin), rapor (kaafi), rekap, santri, BAP, wali
        pg = await page(); await login(pg, "khanza")
        await pg.click(".ab-btn:not(.ab-ai)"); await pg.wait_for_timeout(300)
        await pg.fill(".card input.in", "pulang"); await pg.fill(".card textarea", "tgl 20 des jemput jam 8")
        await pg.click(".ai-btn"); await pg.wait_for_timeout(500); print("pengumuman AI:", await pg.locator(".card input.in").first.input_value(), "|", (await pg.locator(".card textarea").first.input_value())[:40])
        await pg.close()
        pg = await page(); await login(pg, "kaafi")
        await tile(pg, "Rapor"); await pg.wait_for_timeout(300); await pg.locator(".row").first.click(); await pg.wait_for_timeout(500)
        await pg.click(".ai-btn"); await pg.wait_for_timeout(600); print("catatan rapor AI:", (await pg.locator("textarea").first.input_value())[:60])
        log = await pg.evaluate("window.__AI_LOG"); print("data dikirim:", log[-1]["teks"].split("Data:\n")[1].replace("\n", " / ")[:300])
        await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(200); await tile(pg, "Rekap"); await pg.wait_for_timeout(300)
        await pg.locator(".rk").first.click(); await pg.wait_for_timeout(300)
        await pg.click(".ai-btn"); await pg.wait_for_timeout(600); print("analisis rekap:", (await pg.locator(".ai-teks").inner_text()).replace("\n", " / "))
        await pg.screenshot(path="test/ai3_rekap.png", full_page=True)
        await pg.close()
        pg = await page(); await login(pg, "yudistira")
        print("tiles yudistira:", await pg.locator(".tile-lb").all_inner_texts())
        await pg.close()
        pg = await page()
        await pg.click("button:text-is('Wali Santri')"); await pg.wait_for_timeout(200)
        await pg.fill("input.in", await pg.evaluate("1") and "faeyzamasril"); await pg.wait_for_timeout(100)
        await pg.close()
        # 5) Asisten AI (staf & wali), impor nilai, impor jadwal
        pg = await page(); await login(pg, "kaafi")
        await pg.click(".ab-ai"); await pg.wait_for_timeout(300)
        await pg.locator(".chat-saran button").first.click(); await pg.wait_for_selector(".bubble.ai:not(.typing)", timeout=10000)
        await pg.fill(".chat-bar textarea", "Siapa yang perlu dibina?"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(700)
        print("chat:", [t.replace("\n", " / ") for t in await pg.locator(".bubble").all_inner_texts()])
        log = await pg.evaluate("window.__AI_LOG"); sis = log[-1]["sistem"]; print("konteks staf: santri baris =", sis.count(" | kls "), "| riwayat terkirim:", "Percakapan sebelumnya" in log[-1]["teks"])
        await pg.screenshot(path="test/ai4_chat.png")
        await pg.locator(".back").click(); await pg.wait_for_timeout(200)
        await tile(pg, "Mapel IT"); await pg.wait_for_timeout(300)
        print("mapel tiles:", await pg.locator(".tile-lb").all_inner_texts())
        await tile(pg, "Input Nilai"); await pg.wait_for_timeout(300); await pg.locator(".row:has-text('9A')").first.click(); await pg.wait_for_timeout(300)
        await pg.click(".up-cta"); await pg.wait_for_timeout(300)
        await pg.click(".sheet .seg button:text-is('Tempel teks')"); await pg.fill(".sheet textarea", "Nama Projek PTS PAS\nAdiyatma 88 75 85"); await pg.click(".sheet .btn:has-text('Baca data')"); await pg.wait_for_timeout(900)
        print("toast nilai:", await pg.locator(".toast").all_inner_texts())
        print("projek chips:", await pg.locator(".pchip").all_inner_texts())
        print("nilai baris1:", (await pg.locator(".tbl tbody tr").first.inner_text()).replace("\n", " | "))
        await pg.screenshot(path="test/ai5_nilai.png")
        await pg.close()
        pg = await page(); await login(pg, "kaafi")
        await tile(pg, "Kurikulum"); await pg.wait_for_timeout(300); print("kurikulum tiles:", await pg.locator(".tile-lb").all_inner_texts())
        await tile(pg, "Jadwal Mengajar"); await pg.wait_for_timeout(300); await pg.click(".up-cta"); await pg.wait_for_timeout(300)
        await pg.click(".seg button:text-is('Tempel teks')"); await pg.fill("textarea", "Senin jam 1 kelas 7 fiqih"); await pg.click(".btn:has-text('Baca data')"); await pg.wait_for_selector(".imp-row", timeout=10000)
        print("jadwal:", [t.replace("\n", " | ") for t in await pg.locator(".imp-row").all_inner_texts()])
        await pg.screenshot(path="test/ai6_jadwal.png", full_page=True)
        await pg.close()
        pg = await page()
        await pg.click("button:text-is('Wali Santri')"); await pg.wait_for_timeout(200)
        kode = await pg.evaluate("1") and None
        await pg.close()
        print("ERRORS:", errs)
    srv.terminate()
asyncio.run(main())
