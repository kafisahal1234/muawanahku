"""Membuat src/dark.css (Mode Gelap) secara otomatis dari src/theme.css + src/skin.css.

Setiap deklarasi warna disalin ke aturan `html[data-tema=gelap] <selektor>` dengan warna yang dipetakan:
- latar/garis terang  -> permukaan gelap (rona tetap, kejenuhan dikurangi)
- teks gelap          -> teks terang
- latar gelap/aksen (hijau kepala, emas, tombol) dibiarkan
Semua deklarasi warna disalin (meski tidak berubah) agar urutan & spesifisitas tetap sama seperti mode terang.
Jalankan: python3 tools/buat_gelap.py   (butuh: pip install tinycss2)
"""
import re, colorsys, tinycss2

SRC = ["src/theme.css", "src/skin.css"]
PRE = "html[data-tema=gelap]"
HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
RGB = re.compile(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)")
NAMED = re.compile(r"(?<![-\w])(white|#fff)(?![-\w])", re.I)
BG_PROPS = ("background", "background-color", "background-image", "fill")
LINE_PROPS = ("border", "border-color", "border-top", "border-bottom", "border-left", "border-right", "border-top-color", "border-bottom-color",
              "border-left-color", "border-right-color", "outline", "outline-color", "stroke", "--line", "column-rule")
TEXT_PROPS = ("color", "caret-color", "-webkit-text-fill-color", "text-decoration-color")

def hx(c):
    c = c.lstrip("#")
    if len(c) in (3, 4): c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)), (c[6:8] if len(c) == 8 else "")

def ke_hex(rgb, a=""): return "#%02x%02x%02x%s" % (*[max(0, min(255, round(v))) for v in rgb], a)

def petakan(rgb, peran):
    r, g, b = [v / 255 for v in rgb]; h, l, s = colorsys.rgb_to_hls(r, g, b)
    if peran == "bg":
        if l < 0.62 or (s > 0.55 and l < 0.86): return None   # latar gelap / aksen jenuh (emas, hijau): biarkan
        nl = 0.13 + (1 - l) * 0.85; ns = s * (0.45 if s > 0.2 else 0.3)
    elif peran == "line":
        if l < 0.6: return None
        nl = 0.22 + (1 - l) * 0.5; ns = s * 0.35
    else:  # teks
        if l >= 0.55: return None                     # teks terang (di atas hijau) / emas: biarkan
        nl = max(0.62, 0.95 - l * 0.62); ns = s * (0.85 if s > 0.25 else 0.4)
    r2, g2, b2 = colorsys.hls_to_rgb(h, nl, ns)
    return (r2 * 255, g2 * 255, b2 * 255)

def ubah_nilai(nilai, peran):
    def f_hex(m):
        rgb, a = hx(m.group(0)); n = petakan(rgb, peran)
        return ke_hex(n, a) if n else m.group(0)
    def f_rgb(m):
        n = petakan(tuple(int(x) for x in m.groups()), peran)
        return ke_hex(n) if n else m.group(0)
    v = HEX.sub(f_hex, nilai); v = RGB.sub(f_rgb, v)
    v = re.sub(r"(?<![-\w#])white(?![-\w])", lambda m: ke_hex(petakan((255, 255, 255), peran)) if petakan((255, 255, 255), peran) else "white", v)
    return v

def peran_dari(prop):
    p = prop.lower()
    if p in TEXT_PROPS: return "teks"
    if p in BG_PROPS or p.startswith("background"): return "bg"
    if p in LINE_PROPS or p.startswith("border") or p in ("box-shadow",): return "line"
    return None

def ada_warna(v): return bool(HEX.search(v) or RGB.search(v) or re.search(r"(?<![-\w])white(?![-\w])", v))

def prefiks(sel):
    out = []
    for s in sel.split(","):
        s = s.strip()
        if not s: continue
        if s.startswith(":root") or s in ("html",): out.append(PRE); continue
        if s.startswith("html"): out.append(PRE + s[4:]); continue
        if s.startswith("body"): out.append(PRE + " " + s); continue
        if s.startswith("::view-transition"): continue
        out.append(PRE + " " + s)
    return ",".join(out)

AKSEN = set()
def kumpul_aksen(rules):
    for r in rules:
        if r.type == "qualified-rule":
            for d in tinycss2.parse_declaration_list(r.content, skip_whitespace=True, skip_comments=True):
                if d.type == "declaration" and peran_dari(d.name) == "bg":
                    v = tinycss2.serialize(d.value).strip()
                    if ada_warna(v) and ubah_nilai(v, "bg") == v:
                        for sp in tinycss2.serialize(r.prelude).split(","): AKSEN.add(sp.strip())
        elif r.type == "at-rule" and r.content and r.lower_at_keyword in ("media", "supports"):
            kumpul_aksen(tinycss2.parse_rule_list(r.content, skip_whitespace=True, skip_comments=True))
def proses(rules):
    out = []
    for r in rules:
        if r.type == "qualified-rule":
            sel = tinycss2.serialize(r.prelude).strip()
            decls = tinycss2.parse_declaration_list(r.content, skip_whitespace=True, skip_comments=True)
            baru = []
            # latar aksen yang tidak dipetakan (emas/hijau/merah) -> teks di atasnya dibiarkan apa adanya
            aksen = all(sp.strip() in AKSEN for sp in sel.split(",")) or any(d.type == "declaration" and peran_dari(d.name) == "bg" and ada_warna(tinycss2.serialize(d.value)) and ubah_nilai(tinycss2.serialize(d.value).strip(), "bg") == tinycss2.serialize(d.value).strip() for d in decls)
            for d in decls:
                if d.type != "declaration": continue
                v = tinycss2.serialize(d.value).strip(); peran = peran_dari(d.name)
                if not peran or not ada_warna(v) or d.name.startswith("--"): continue
                if "box-shadow" == d.name: continue
                nv = v if (peran == "teks" and aksen) else ubah_nilai(v, peran)
                baru.append(f"{d.name}:{nv}{'!important' if d.important else ''}")
            ps = prefiks(sel)
            if baru and ps: out.append(f"{ps}{{{';'.join(baru)}}}")
        elif r.type == "at-rule" and r.lower_at_keyword in ("media", "supports") and r.content:
            isi = proses(tinycss2.parse_rule_list(r.content, skip_whitespace=True, skip_comments=True))
            if isi: out.append(f"@{r.at_keyword} {tinycss2.serialize(r.prelude).strip()}{{{''.join(isi)}}}")
    return out

def main():
    css = "".join(open(f).read() for f in SRC)
    rules = tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True)
    kumpul_aksen(rules); hasil = proses(rules)
    kepala = f"""/* DIBUAT OTOMATIS oleh tools/buat_gelap.py — jangan diedit manual. Penyesuaian tangan ada di src/dark_manual.css */
{PRE}{{color-scheme:dark;--bg:#0E1712;--card:#16211B;--line:#26352C;--ink:#E3EDE7;--mut:#9DB3A6}}
{PRE} body{{background:#0A120E}}
"""
    open("src/dark.css", "w").write(kepala + "\n".join(hasil) + "\n")
    print("dark.css:", len(hasil), "aturan")

if __name__ == "__main__":
    main()
