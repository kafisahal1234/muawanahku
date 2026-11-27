# Pantauan Santri untuk Mudir: Mudir umum (syamsul) melihat semua pondok, Mudir Pondok 21 (hidayat) hanya pondok 21.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
D = OUT / "pantauan"; D.mkdir(exist_ok=True)
SEED_KES = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K)||'{}');
 const S=Object.entries(d.santriEdit||{}).filter(([k,v])=>!v.hapus&&v.kelas); const p29=S.filter(([k,v])=>v.kelas==='7'||v.kelas==='8'), p21=S.filter(([k,v])=>v.kelas[0]==='9');
 d.izin={}; d.bap={}; const now=Date.now(), iso=x=>new Date(now+x*864e5).toISOString();
 const iz=(id,s,jenis,a,b,status,extra)=>d.izin[id]={santri:s[0],jenis,alasan:extra||'',keluar:iso(a),kembali:iso(b),status,oleh:'x',ts:now+a};
 iz('i1',p21[0],'Perpulangan',-2,-0.5,'aktif','Acara keluarga (pernikahan kakak)'); iz('i2',p21[3],'Sakit',-1,2,'aktif','Demam, dirawat di rumah'); iz('i3',p29[2],'Perpulangan',-1,1,'aktif','Libur akhir pekan');
 iz('i4',p21[5],'Keluar',-6,-5.8,'kembali','Periksa gigi'); d.izin.i4.kembaliAktual=iso(-5.85);
 iz('i5',p29[7],'Perpulangan',-9,-7,'kembali','Keperluan keluarga'); d.izin.i5.kembaliAktual=iso(-6.5); d.izin.i5.telat=true;
 const b=(id,s,tgl,nama,tingkat,poin,tind,kron,tempat)=>d.bap[id]={santri:s[0],tanggal:tgl,pelanggaranNama:nama,tingkat,poin,tindakan:tind,kronologi:kron,tempat,oleh:'x',ts:now};
 b('b1',p21[1],'2026-11-25','Keluar pondok tanpa izin','Berat',25,{jenis:'sp1'},'Santri keluar lewat pagar belakang setelah Isya untuk membeli makanan, kembali pukul 21.30.','Pagar belakang asrama');
 b('b2',p21[2],'2026-11-20','Membawa HP tanpa izin','Sedang',15,{jenis:'teguran'},'HP ditemukan saat razia kamar, disita dan diserahkan ke wali asrama.','Kamar 3');
 b('b3',p29[4],'2026-11-18','Terlambat sholat berjamaah berulang','Ringan',5,{jenis:'teguran'},'','Masjid');
 localStorage.setItem(K,JSON.stringify(d)); return 1;}"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for u in ["hidayat", "syamsul"]:
            c = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce"); pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KEGIATAN); await pg.evaluate(SEED_KES); await pg.goto(URL_DIST); await pg.wait_for_timeout(800); await pg.evaluate(SEED_KES)
            await masuk(pg, u); await pg.screenshot(path=str(D / f"{u}_beranda.png"))
            await pg.click(".tiles >> text=Pantauan Santri"); await pg.wait_for_timeout(900)
            await pg.screenshot(path=str(D / f"{u}_pantauan.png"), full_page=True)
            nama = await pg.locator(".pt-row .pt-top b").all_inner_texts(); print(u, "baris:", len(nama))
            await pg.go_back(); await pg.wait_for_timeout(400)
            await pg.click(".bnav >> text=Akun"); await pg.wait_for_timeout(300)
            await c.close()
        print("ERR", errs); await b.close()
asyncio.run(main())
