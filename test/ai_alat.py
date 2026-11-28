# Alat database Asisten AI: hasil tiap alat & batas hak akses (pakai AI tiruan; tidak memanggil Gemini)
import asyncio, sys, json
sys.path.insert(0, "test")
from playwright.async_api import async_playwright
from _jalur import URL_DIST
from _demo import masuk, SEED_KEGIATAN
MOCK = """window.__AI_MOCK = async ({ teks, alat }) => { window.__hasil = {};
  const uji = [["cari_santri",{kelas:"8"}],["rincian_santri",{santri:"Hasan"}],["evaluasi",{bidang:"tahfidz",periode:"pekan_ini"}],["evaluasi",{bidang:"kinerja_guru",periode:"bulan_ini"}],
    ["evaluasi",{bidang:"kesantrian",periode:"bulan_ini",pondok:"29"}],["riwayat_setoran",{periode:"pekan_lalu",kelas:"7"}],["absensi",{jenis:"halaqah",periode:"pekan_ini",santri:"Hasan"}],
    ["data_guru",{}],["jadwal",{hari:"Senin"}],["nilai",{kelas:"7"}],["izin_pelanggaran",{periode:"bulan_ini"}],["laporan_berkala",{jenis:"pekanan"}]];
  for (const [n,a] of uji) window.__hasil[n + (n==="evaluasi" ? "_"+a.bidang : "")] = alat ? alat.jalankan(n, a) : "tanpa alat";
  return "ok"; };"""
async def main():
    err = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 844}); pg.on("pageerror", lambda e: err.append(str(e)))
        await pg.add_init_script(MOCK)
        await pg.goto(URL_DIST); await pg.evaluate(SEED_KEGIATAN); await pg.goto(URL_DIST)
        for u in ["ugi", "syamsul"]:
            await masuk(pg, u); await pg.locator(".ab-ai").first.click(); await pg.wait_for_timeout(900)
            await pg.fill("textarea", "uji alat"); await pg.click(".chat-send"); await pg.wait_for_timeout(3000)
            h = await pg.evaluate("window.__hasil")
            if not h: print(u, "TIDAK ADA HASIL"); continue
            for k, v in h.items():
                s = json.dumps(v, ensure_ascii=False)
                print(f"{u:8s} {k:26s} {len(s):6d} {s[:150]}")
            kin = h.get("evaluasi_kinerja_guru", {})
            print(u, "kinerja: jumlah perlu", kin.get("jumlah_perlu_tindak_lanjut"), "| akses:", kin.get("catatan_akses"))
        # wali: hanya ananda sendiri
        await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL_DIST); await pg.wait_for_timeout(600)
        await pg.locator("text=Wali Santri").first.click(); await pg.locator("text=Lihat semua akun demo").click(); await pg.wait_for_timeout(300)
        await pg.locator(".demo-acc").nth(3).click(); await pg.wait_for_timeout(4000)
        await pg.locator(".ab-ai").first.click(); await pg.wait_for_timeout(900)
        await pg.fill("textarea", "uji alat"); await pg.click(".chat-send"); await pg.wait_for_timeout(3000)
        h = await pg.evaluate("window.__hasil") or {}
        for k in ["cari_santri", "rincian_santri", "evaluasi_tahfidz", "data_guru", "izin_pelanggaran"]:
            print("wali    ", k, json.dumps(h.get(k), ensure_ascii=False)[:160])
        await b.close()
    print("ERR", err)
asyncio.run(main())
