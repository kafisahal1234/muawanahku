"""Impor laporan kegiatan Tahfidz/Tahsin 20–21 November 2026 (grup WA) ke data dasar MuawanahKu (src/data.js).
- Total hafalan tiap santri sesuai laporan (juz + halaman; 1 lembar = 2 halaman; 0,5 juz = 10 halaman)
- Susunan halaqah & asrama sesuai laporan; ustadz memakai akun yang sudah ada (ugi = Ust. Hanif, habib = Ust. Irul)
- Status Tahsin awal (Iqro' KH. As'ad Humam, jilid 1–6 → Al-Qur'an) untuk santri yang dilaporkan tingkat Iqro'-nya
Rincian juz mana saja yang sudah selesai adalah perkiraan dari total + juz yang sedang disetorkan; bisa dirapikan
Wadir Tahfidz lewat menu Data Awal Hafalan."""
import json, re
P = "/home/claude/webapp/src/data.js"
src = open(P).read()
pertama, sisa = src.split("\n", 1)
D = json.loads(pertama[len("export const DATA = "):].rstrip(";"))
A = D["urutanJuz"]                       # urutan pondok: 30, 29, 1, 2, ... 28
B = [30, 29] + list(range(28, 0, -1))    # urutan mundur: 30, 29, 28, ... 1

def awal(T, H=0, C=None, tasmi=()):
    """T juz + H halaman; C = juz yang sedang disetorkan (bila disebut); tasmi = juz yang disebut sudah ditasmi'."""
    sel = [j for j in tasmi if j != C][:T]
    if C is not None:
        for j in A:
            if j == C or len(sel) >= T: break
            if j not in sel: sel.append(j)
        for j in B:
            if len(sel) >= T: break
            if j != C and j not in sel: sel.append(j)
        aktif = C
    else:
        for j in A:
            if len(sel) >= T: break
            if j not in sel: sel.append(j)
        aktif = next(j for j in A if j not in sel)
    return dict(selesai=sel, aktif=aktif, baris=min(H, 19) * 15)

def juzDes(x):  # 2.5 juz → (2, 10 hal)
    t = int(x); return t, int(round((x - t) * 20))

NOL = dict(selesai=[], aktif=30, baris=0)
# ---- hafalan (sid: awal) ----
HAF = {
  # Halaqah Ust. Kafi · Abdurrahman bin Auf
  "s065": awal(12), "s056": awal(10), "s059": awal(9), "s057": awal(9), "s064": awal(8), "s062": awal(7), "s063": awal(6), "s061": awal(3), "s060": awal(3), "s058": awal(3),
  # Halaqah Ust. Abdul · Umar bin Khattab
  "s068": awal(8, 2, 27, [5]), "s074": awal(2, 0, 28), "s067": awal(2, 0, 1), "s075": awal(3, 0, 2), "s080": awal(5), "s082": awal(3, 0, 2),
  # Halaqah Ust. Hidayat (Abu Bakar)
  "s072": awal(14, 0, None, [10, 11]), "s073": awal(13, 6, None, [8]), "s069": awal(8, 10, 6), "s071": awal(5, 4, 3), "s070": awal(7), "s066": awal(7, 0, None, [3, 4]),
  # Halaqah Ust. Izzuddin · Utsman bin Affan
  "s081": awal(8), "s078": awal(5), "s076": awal(4), "s077": awal(3), "s083": awal(3), "s079": awal(3),
  # Halaqah Ust. Rifaul · Sa'ad bin Abi Waqqash
  "s084": awal(6, 0, 4), "s085": awal(5, 0, 3), "s087": awal(13, 0, 11), "s089": awal(5, 0, 3), "s086": awal(5, 0, 3), "s090": awal(5, 0, 3),
  "s088": awal(8, 0, 5), "s093": awal(2, 0, 29), "s091": awal(7, 0, 5), "s092": awal(7, 0, 5),
  # Halaqah Ust. Khoirul Anam · Ali bin Abi Thalib
  "s103": awal(4, 10), "s098": awal(2, 13), "s097": awal(2), "s102": awal(7, 6), "s099": awal(6, 12), "s101": awal(6, 5), "s095": awal(13, 0, None, [10]),
  "s100": awal(4), "s094": awal(2), "s096": awal(3, 10),
  # Halaqah Ust. Khoirul Anwar · Hasyim Asy'ari
  "s020": awal(10, 12, None, [7]), "s021": awal(2, 11, 1, [29]), "s027": awal(1, 12, 29), "s028": awal(3, 10, 2, [1]), "s026": awal(4, 0, None, [1]),
  "s022": awal(1, 16, 1), "s024": awal(3, 8, 2), "s025": awal(3, 9, 1, [28]), "s023": awal(1, 13, 29),
  # Halaqah Ust. Hanif · Teuku Umar
  "s015": awal(11, 6, 7, [6]), "s013": awal(4, 0, 1), "s019": awal(2, 0, 29), "s018": awal(2, 0, 29), "s017": awal(1, 4, 29), "s014": awal(1, 18, 29),
  "s016": awal(3, 0, 1), "s010": awal(3, 0, 1), "s011": awal(1, 6, 29), "s012": awal(2, 11, 1, [29]),
  # Halaqah Ust. Rangga · M. Natsir (setoran = total hafalan)
  "s048": awal(*juzDes(2.5)), "s050": NOL, "s049": NOL, "s047": awal(1), "s051": awal(9), "s054": awal(*juzDes(3.5)), "s053": awal(*juzDes(0.5)),
  "s052": awal(*juzDes(1.5)), "s055": awal(*juzDes(0.5)),
}
# Ahmad Dahlan & Agus Salim: laporan berisi tingkat Iqro' saja, hafalan 0
for sid in ["s029", "s030", "s031", "s032", "s033", "s034", "s035", "s036", "s037", "s038", "s039", "s040", "s041", "s042", "s043", "s044", "s045", "s046"]:
    HAF[sid] = dict(NOL)

def iq(j, hal=0, ujian=False): return dict(tingkat="iqra", jilid=j, hal=hal, ujian=ujian)
def qr(ket=""): return dict(tingkat="quran", ket=ket)
TAHSIN = {
  # Ahmad Dahlan
  "s034": iq(6), "s032": qr(), "s031": iq(6), "s030": iq(6), "s029": iq(4), "s035": iq(4), "s033": dict(tingkat="iqra", jilid=None, hal=0), "s037": iq(3),
  # Agus Salim
  "s040": iq(5, 10), "s038": qr("Juz 30 · Al-Fajr"), "s042": iq(4, 0, True), "s046": iq(6, 11), "s045": iq(4, 0, True), "s043": iq(3, 0, True),
  "s039": iq(6, 0, True), "s044": iq(5, 25), "s041": iq(5, 0, True),
  # M. Natsir
  "s048": iq(4, 0, True), "s050": iq(4, 0, True), "s049": iq(4, 0, True), "s047": iq(4, 0, True), "s051": qr(), "s054": qr(), "s053": qr(), "s052": qr(), "s055": iq(5),
}
HALAQAH = {  # santri pindah halaqah sesuai laporan
  "s065": "h7", "s074": "h8", "s075": "h8", "s080": "h8", "s082": "h8",
  "s066": "h12", "s069": "h12", "s070": "h12", "s071": "h12", "s072": "h12", "s073": "h12",
  "s083": "h9", "s093": "h10", "s103": "h11",
}
# ---- ustadz: pakai akun yang SUDAH ADA (Admin sudah mengganti namanya di database) ----
# akun "ugi" = Ust. Hanif (Teuku Umar), akun "habib" = Ust. Irul / Khoirul Anwar (K.H. Hasyim Asy'ari),
# akun "naufal" = Ust. Ugi Abdul Halim Suhul (Agus Salim). Jangan membuat akun baru agar tidak dobel.
D["staff"] = [x for x in D["staff"] if x["id"] not in ("hanif", "khoirulanwar")]
NAMA = {"ugi": ("Ust. Hanif", "Ust. Hanif"), "habib": ("Ust. Irul", "Ust. Irul"), "naufal": ("Ust. Ugi Abdul Halim Suhul", "Ust. Ugi"), "khoirul": ("Ust. Khoirul Anam", "Ust. Khoirul Anam")}
for x in D["staff"]:
    if x["id"] in NAMA: x["nama"], x["pendek"] = NAMA[x["id"]]
for a_ in D["asrama"]:
    if a_["id"] == "a2": a_["musyrif"] = "ugi"
    if a_["id"] == "a3": a_["musyrif"] = "habib"; a_["nama"] = "K.H. Hasyim Asy'ari"
for h in D["halaqah"]:
    if h["id"] == "h2": h.update(guru="ugi"); h.pop("nama", None); h["nama"] = "Halaqah Ust. Hanif"
    if h["id"] == "h3": h.update(guru="habib"); h["nama"] = "Halaqah Ust. Irul"
    if h["id"] == "h5": h["nama"] = "Halaqah Ust. Ugi"
    if h["id"] == "h11": h["nama"] = "Halaqah Ust. Khoirul Anam"
    if h["id"] == "h12": h["nama"] = "Halaqah Ust. Hidayat (Abu Bakar)"; h["namaTetap"] = True
# ---- santri ----
for s in D["santri"]:
    sid = s["id"]
    if sid in HAF: s["awal"] = HAF[sid]
    if sid in HALAQAH: s["halaqah"] = HALAQAH[sid]
    if sid in TAHSIN: s["tahsin"] = TAHSIN[sid]
if not any(s["id"] == "s104" for s in D["santri"]):
    w, b = juzDes(3.5)
    D["santri"].append(dict(id="s104", nama="Syamil", kelas="7", asrama="a6", wali="syamil", panggilan="Syamil", awal=awal(w, b), halaqah="h6", tahsin=qr(), lengkapi=True))
D["impor"] = dict(tgl="2026-11-21", sumber="Laporan kegiatan Tahfidz/Tahsin grup WA 20–21 November 2026")
open(P, "w").write("export const DATA = " + json.dumps(D, ensure_ascii=False) + ";\n" + sisa)
print("ok:", len(HAF), "hafalan,", len(TAHSIN) + 1, "tahsin,", len(HALAQAH), "pindah halaqah; santri", len(D["santri"]), "staff", len(D["staff"]))
