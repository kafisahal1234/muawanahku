# Uji lokal: isi data CONTOH (test/contoh/seed.json — nama fiktif) ke localStorage sebelum aplikasi dimuat.
# Pakai: PYTHONPATH=test/pwseed python3 test/<skrip>.py
import json, pathlib
SEED = json.loads((pathlib.Path(__file__).resolve().parents[1] / "contoh" / "seed.json").read_text())
JS = """(()=>{try{const K='muawanahku_demo_v1',S=%s;const d=JSON.parse(localStorage.getItem(K)||'{}');let ub=false;for(const c of ['staffEdit','akun','santriEdit']){d[c]=d[c]||{};for(const [k,v] of Object.entries(S[c])) if(!(k in d[c])){d[c][k]=v;ub=true;}}if(ub)localStorage.setItem(K,JSON.stringify(d));}catch(e){}})();""" % json.dumps(SEED)
try:
    from playwright.async_api._generated import Browser
    _nc, _np = Browser.new_context, Browser.new_page
    async def new_context(self, *a, **k):
        c = await _nc(self, *a, **k); await c.add_init_script(JS); return c
    async def new_page(self, *a, **k):
        p = await _np(self, *a, **k); await p.context.add_init_script(JS); return p
    Browser.new_context, Browser.new_page = new_context, new_page
except Exception as e:
    print("seed patch gagal:", e)
