# Data kegiatan contoh (absen halaqah, setoran) untuk melihat rekap & tampilan wali saat uji lokal.
from _jalur import URL_DIST
SEED_KEGIATAN = """()=>{const K='muawanahku_demo_v1';const d=JSON.parse(localStorage.getItem(K)||'{}');
 const S=Object.entries(d.santriEdit||{}).filter(([k,v])=>!v.hapus&&v.halaqah); let r=7; const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};
 d.absenHalaqah=d.absenHalaqah||{}; d.setoran=d.setoran||{};
 const hq=[...new Set(S.map(([k,v])=>v.halaqah))];
 for(let day=16;day<=27;day++){const t=`2026-11-${day}`;const wd=new Date(t+'T00:00').getDay(); if(wd===0) continue;
  const ses=wd===6?['Shubuh']:['Shubuh','Dhuha','Malam'];
  hq.forEach((h,hi)=>{ if(rnd()<0.12*(hi%3)) return; ses.forEach(se=>{const st={}; S.filter(([k,v])=>v.halaqah===h).forEach(([k])=>{const x=rnd(); st[k]=x<0.82+0.02*(hi%5)?'H':x<0.9?'S':x<0.95?'I':'A'}); d.absenHalaqah[`${h}_${t}_${se}`]={halaqah:h,tanggal:t,sesi:se,status:st,guru:'x',ts:1}})});
  S.forEach(([k,v],i)=>{ if(rnd()<0.45){const b=Math.floor(rnd()*14)+3; d.setoran['z'+day+'_'+i]={santri:k,jenis:'ziyadah',tanggal:t,sesi:'Shubuh',juz:30,sebelum:0,sesudah:b,baris:b,lulus:true,nilai:85,ts:1}}
    if(rnd()<0.35){const a=Math.floor(rnd()*10)+1; d.setoran['m'+day+'_'+i]={santri:k,jenis:'murojaah',tanggal:t,juz:30,halDari:a,halSampai:a+Math.floor(rnd()*4),nilai:80,lulus:true,ts:1}}
    if(day===20&&rnd()<0.15) d.setoran['t'+i]={santri:k,jenis:'tasmi',tanggal:t,juz:30,lulus:true,ts:1}; if(rnd()<0.08) d.setoran['n'+day+'_'+i]={santri:k,jenis:'manzil',tanggal:t,juz:30,nilai:88,lulus:true,ts:1} });
 }
 localStorage.setItem(K,JSON.stringify(d)); return Object.keys(d.absenHalaqah).length;}"""
async def masuk(pg, u, p=None):
    await pg.evaluate("sessionStorage.clear(); localStorage.removeItem('mk_user')"); await pg.goto(URL_DIST); await pg.wait_for_timeout(500)
    await pg.fill("input[autocomplete=username]", u); await pg.fill("input[type=password]", p or u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(4000)
