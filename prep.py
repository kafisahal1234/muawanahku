"""Siapkan data master demo MuawanahKu -> src/data.js"""
import json, re, difflib, base64, io, random
from PIL import Image
import openpyxl

def norm(s):
    s = s.lower().replace("’", "'").replace("‘", "'")
    s = re.sub(r"\bmuhamm?ad\b|\bm\b\.?", " ", s)
    s = re.sub(r"[^a-z ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

# ---------- kelas rosters ----------
wb = openpyxl.load_workbook("/home/claude/data_in/absen.xlsx", data_only=True)
def roster(ws):
    out = []
    for r in ws.iter_rows(values_only=True):
        if isinstance(r[0], (int, float)) and r[1]: out.append(str(r[1]).strip())
    return out
K8 = roster(wb["ANGK 2"]); K7 = roster(wb["ANGK 3"])

# ---------- asrama ----------
A29 = {
 "Sultan Hasanudin": ("yudistira", ["Muhamad Faeyza Masril", "M Fatih Machali Sidiq", "Muhammad Aprilio Afkha", "M. Damar Jati", "Muhammad Dwino Alkadhafy",
                       "Muhammad Gaza Al Faqih", "Muhammad Ibnu Khafidz", "Muhammad Raka Alvaro", "Gibrant Zhaky Alvaro"]),
 "Teuku Umar": ("ugi", ["Abdulammar Sayyid Al Zahid", "Ahmad Fadoli", "Bilfaqih Fahmi Alkalifi", "Evan Ziggy Alfayadh", "Faqih Arrif'at Dinata",
                "Kautsar Vetto Ficeska", "Khalfany Azizi A'yun Rojal", "Muhammad Abizaar Faadhil Zihni", "M Zulfadhli Fayyadh", "Yatalatof Ulil Albab"]),
 "Hasyim Asyari": ("habib", ["Muhammad Satria Al Fatih", "Musa Abdillah Hafidz", "Nadhif Adendra", "Prima Ramadhan", "Putra Pratama Ramadani",
                   "Raihan Hendra Adzein", "Rifqy Faeza Djoesan", "Sultan Abiyyu Kurniawan", "Shaquille Benzema Efendi"]),
 "Ahmad Dahlan": ("affan", ["Nashril Karim Asy Syaqi", "Hanzalah Rosyiqul Abid", "Muhammad Uwais Bagaskara", "M. Nanda Berlian", "Ragil Arif Ade Putra",
                  "Aska Alansyah", "Adam Fariz Annaufal", "Muhammad Adnan Al Fattah", "M. Gilang Ramadhan Midra"]),
 "Agus Salim": ("naufal", ["Muhammad Maulana Fauzie", "M. Istiqlal Nafi Al Buchori", "Muhammad Atahillah Zaidan", "Rafael Sakha Yovan Putra", "M. Azka Han",
                "Daffa Satya Aldric", "Nizam Aurellio", "Raffa Maulana Ibrahim", "M. Faeyza Hanan"]),
 "M. Natsir": ("rangga", ["M. Azka Reffaldo", "Ikhsan Cetta Yudha", "Kenzie Yafiq H", "Gibran Alvaro Ramadhan", "Rival Trizaliska", "Varid Pratama",
               "Yafiq Khadaffi Abbasy", "Muhammad Rasyid Ramadhan", "Al Qurtubi Sakato"]),
}
A21 = {  # nama dari Daftar Santri Kelas 9 (PDF), kelas per kelompok
 "Abdurrahman bin Auf": ("kaafi", [("9A", n) for n in ["Adiyatma Wiryateja", "Affan Abdillah", "Akmal Ghifary", "Daffa Tsaqib Alzaky Nugraha", "Davin Rizkiy Abira Akbar",
                          "Muhammad Daffa Atsal Atmaja", "Muhammad Sakha Alfallah", "Naufal Arya Dinata", "Rendi Akbar Jaya", "Sultan Abdullah Fatih Sanjaya"]]),
 "Umar bin Khattab": ("abdul", [("9A", n) for n in ["Afgan Aruna Assyafiah", "Aza Ghonim", "Fahreza Fahmi Fahlefi", "Faris Al Faridzi Saputra", "Muhammad Ahsan Danish Dwy Putra",
                       "Muhammad Aidil Ismail", "Muhammad Ibad Ghaly Arkananta", "Muhammad Maulana Bagus Wahyudi", "Reza Alpa Novrie S"]]),
 "Utsman bin Affan": ("izzudin", [("9A", n) for n in ["Fadhil Akhdan Baihaqy", "Lutfi Alif Awafi Ardiansyah", "M. Nijam Almuzaki", "Muhammad Sultan Al Fakhri", "Zidan Arkhad Tiko Purnomo"]] +
                      [("9B", n) for n in ["Athaa Al Fakhri Wibowo", "Muhammad Rafiandra S", "Sakha Zidane Dhaifullah", "Wempi Syahputra"]]),
 "Sa'ad bin Abi Waqqash": ("rifaul", [("9B", n) for n in ["Abid Aqil Pranaja", "Afkar Hisyam Nabiha", "Hanan Asyifa Rizky", "M. Ishfan Rahmadani", "Asram Raya Anugrah",
                           "Maulana Fadlan Ramadhan", "Muhammad Elrafka Jabbar Arsy", "Muhammad Orlando", "Shaquille Royyan Zafir", "Yazid Izza Fahrezi"]]),
 "Ali bin Abi Thalib": ("khoirul", [("9B", n) for n in ["Abdullah Mudzaki Alcantara", "Dava Edo Saputra", "M. Azmi Al Mair", "M. Deni Alfathan", "M. Rafa Azzayan",
                        "M. Regie An Nawawi", "Nathan Ezra Pratama", "Nizam Razka Adz Ziqra", "Riski Aditya", "Wafi Dzaki Muttaqin"]]),
}

def kelas29(name):
    best, bk = 0, None
    for k, lst in (("7", K7), ("8", K8)):
        for r in lst:
            sc = difflib.SequenceMatcher(None, norm(name), norm(r)).ratio()
            if sc > best: best, bk = sc, (k, r)
    return bk[0], best, bk[1]

STAFF = [
 dict(id="syamsul", nama="Ust. Syamsul Ma'arif, Lc.", pendek="Ust. Syamsul", roles=["mudir", "guru_mapel"], ajar=[["fiqih", "7"], ["fiqih", "8"]]),
 dict(id="hidayat", nama="Ust. Hidayat, S.Pd", pendek="Ust. Hidayat", roles=["wadir_tahfidz"], ajar=[]),
 dict(id="kaafi", nama="Ust. M. Kafi Sahal Muhtar, S.Pd", pendek="Ust. Kafi", roles=["wadir_kurikulum", "musyrif", "guru_mapel"], ajar=[["it", "9A"], ["it", "9B"]]),
 dict(id="yudistira", nama="Ust. Yudistira, S.Pd", pendek="Ust. Yudhis", roles=["wadir_kesantrian", "musyrif", "guru_mapel"], pondok="29", ajar=[["it", "8"]]),
 dict(id="izzudin", nama="Ust. Izzudin, BA", pendek="Ust. Izzudin", roles=["wadir_kesantrian", "musyrif", "guru_mapel"], pondok="21", ajar=[["fiqih", "9A"], ["fiqih", "9B"]]),
 dict(id="rangga", nama="Ust. Rangga", pendek="Ust. Rangga", roles=["musyrif", "guru_mapel"], ajar=[["it", "7"]]),
 dict(id="khanza", nama="Ustdzh. Khanza Nur Izzati", pendek="Ustdzh. Khanza", roles=["admin", "guru_mapel"], ajar=[["bing", "7"], ["bing", "8"]]),
 dict(id="ridho", nama="Ust. Ridho Istianto", pendek="Ust. Ridho", roles=["guru_mapel"], ajar=[["bing", "9A"], ["bing", "9B"]]),
 dict(id="jazulis", nama="Ust. Jazulis", pendek="Ust. Jazulis", roles=["guru_mapel"], ajar=[["karakter", "7"], ["karakter", "8"], ["karakter", "9A"], ["karakter", "9B"]]),
 dict(id="ugi", nama="Ust. Ugi", pendek="Ust. Ugi", roles=["musyrif"], ajar=[]),
 dict(id="habib", nama="Ust. Habib", pendek="Ust. Habib", roles=["musyrif"], ajar=[]),
 dict(id="affan", nama="Ust. Affan", pendek="Ust. Affan", roles=["musyrif"], ajar=[]),
 dict(id="naufal", nama="Ust. Naufal", pendek="Ust. Naufal", roles=["musyrif"], ajar=[]),
 dict(id="khoirul", nama="Ust. Khoirul Anam", pendek="Ust. Khoirul", roles=["musyrif"], ajar=[]),
 dict(id="rifaul", nama="Ust. Rifaul", pendek="Ust. Rifaul", roles=["musyrif"], ajar=[]),
 dict(id="abdul", nama="Ust. Abdul", pendek="Ust. Abdul", roles=["musyrif"], ajar=[]),
]
for s in STAFF: s["username"] = s["id"]; s["password"] = s["id"] + "123"

ASRAMA, SANTRI = [], []
sid = 0
for nama, (mus, lst) in A29.items():
    aid = "a" + str(len(ASRAMA) + 1); ASRAMA.append(dict(id=aid, nama=nama, pondok="29", musyrif=mus))
    for n in lst:
        k, sc, src = kelas29(n)
        if sc < 0.6: print("LOW", n, k, sc, src)
        sid += 1; SANTRI.append(dict(id=f"s{sid:03d}", nama=n.strip(), kelas=k, asrama=aid))
for nama, (mus, lst) in A21.items():
    aid = "a" + str(len(ASRAMA) + 1); ASRAMA.append(dict(id=aid, nama=nama, pondok="21", musyrif=mus))
    for k, n in lst:
        sid += 1; SANTRI.append(dict(id=f"s{sid:03d}", nama=n, kelas=k, asrama=aid))
from collections import Counter
print(Counter(s["kelas"] for s in SANTRI), len(SANTRI))

# wali usernames: panggilan = kata pertama selain Muhammad/M/Ahmad
staff_ids = {x["id"] for x in STAFF}
words_of = lambda n: [w for w in re.sub(r"[^A-Za-z ]", " ", n).split() if w.lower() not in ("muhammad", "muhamad", "m", "ahmad", "al")]
first = Counter(words_of(s["nama"])[0].lower() for s in SANTRI)
taken = set()
for s in SANTRI:
    w = words_of(s["nama"]); u = w[0].lower()
    if first[u] > 1 or u in staff_ids: u = (w[0] + (w[1] if len(w) > 1 else "")).lower()
    while u in taken or u in staff_ids: u += "x"
    taken.add(u); s["wali"] = u; s["panggilan"] = w[0]

# ---------- data awal hafalan (contoh, bisa diubah Wadir Tahfidz) ----------
ORDER = [30, 29] + list(range(1, 29))
rnd = random.Random(20261120)
for s in SANTRI:
    if s["kelas"] == "7": done = rnd.choice([0, 1, 1, 1])
    elif s["kelas"] == "8": done = rnd.choice([1, 2, 2, 2, 3])
    else: done = rnd.choice([2, 3, 3, 3, 4, 5])
    s["awal"] = dict(selesai=ORDER[:done], aktif=ORDER[done], baris=rnd.randint(10, 280))

# ---------- jadwal default (tanpa bentrok) ----------
MAPEL = [
 dict(id="fiqih", nama="Fiqih", aspek=["Pengetahuan", "Keterampilan / Praktik Ibadah", "Sikap", "Projek Fiqih"]),
 dict(id="it", nama="IT", aspek=["Pengetahuan (Kognitif)", "Keterampilan (Psikomotorik)", "Sikap dan Karakter (Afektif)", "Project IT"]),
 dict(id="bing", nama="Bahasa Inggris", aspek=["Speaking", "Writing", "Reading & Listening", "Sikap dan Karakter", "Project Bahasa Inggris"]),
 dict(id="karakter", nama="Pendidikan Karakter", aspek=["Pengetahuan", "Pembiasaan / Praktik", "Sikap", "Projek Karakter"]),
]
JAM = [dict(id="j1", nama="Jam 1", mulai="10.15", selesai="11.45"), dict(id="j2", nama="Jam 2", mulai="13.00", selesai="14.30")]
HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]  # KBM mapel Senin–Jumat; halaqah Senin–Sabtu (Sabtu hanya Shubuh)
pengampu = {}
for s in STAFF:
    for m, k in s["ajar"]: pengampu[(m, k)] = s["id"]
need = []
for k in ["7", "8", "9A", "9B"]:
    need += [(k, "fiqih"), (k, "fiqih"), (k, "it"), (k, "it"), (k, "bing"), (k, "bing"), (k, "karakter")]
rnd2 = random.Random(7)
JADWAL = []
busy_g, busy_k, per_day = set(), set(), Counter()
slots = [(h, j["id"]) for h in HARI for j in JAM]
for k, m in sorted(need, key=lambda x: (x[1] == "karakter", x[0])):
    g = pengampu[(m, k)]
    cands = [(h, j) for h, j in slots if (h, j, g) not in busy_g and (h, j, k) not in busy_k and per_day[(k, h, m)] == 0]
    cands.sort(key=lambda hj: (per_day[(k, hj[0])], rnd2.random()))
    h, j = cands[0]
    busy_g.add((h, j, g)); busy_k.add((h, j, k)); per_day[(k, h, m)] += 1; per_day[(k, h)] += 1
    JADWAL.append(dict(id=f"{h[:3].lower()}-{j}-{k}", hari=h, jam=j, kelas=k, mapel=m, guru=g))
print("jadwal", len(JADWAL))

# ---------- mutabaah ----------
IBADAH = ["Sholat Tahajjud", "Sholat 2 rakaat sebelum Shubuh", "Sholat Shubuh takbiratul ihram bersama imam", "Halaqah ba'da Shubuh", "Morning Spirit / Apel Pagi",
          "Sholat Dhuha", "Halaqah Dhuha", "Sholat Qabliyah Dhuhur", "Sholat Dhuhur takbiratul ihram bersama imam", "Sholat Ba'diyah Dhuhur",
          "Sholat Ashar takbiratul ihram bersama imam", "Sholat Maghrib takbiratul ihram bersama imam", "Sholat Ba'diyah Maghrib",
          "Sholat Isya takbiratul ihram bersama imam", "Sholat Ba'diyah Isya", "Tilawah Al-Qur'an 5 lembar", "Dzikir pagi", "Dzikir petang",
          "Berdoa untuk diri, orang tua, dan guru", "Puasa sunnah Senin atau Kamis"]
ADAB = ["Makan tidak dengan berdiri", "Makan tidak dengan tangan kiri", "Makan dimulai dengan \"Bismillah\"", "Wudhu sebelum tidur", "Berdoa sebelum tidur",
        "Masuk kamar mandi dengan kaki kiri", "Keluar kamar mandi dengan kaki kanan", "Membaca doa masuk kamar mandi", "Berbicara tanpa mencaci maki atau kata kotor",
        "Menjaga amanah barang pribadi", "Tidak ghosob (memakai barang orang lain tanpa izin)", "Tidak menyakiti orang lain dengan lisan atau perbuatan",
        "Merapikan tempat tidur dan menjaga kebersihan asrama", "Tidak membuang sampah sembarangan", "Melaksanakan tugas piket dengan sebaik-baiknya"]
# butir mutaba'ah yang terisi otomatis dari MOTD / absen halaqah: index -> (sumber, kunci)
AUTO = {0: ["motd", "tahajud"], 2: ["motd", "subuh"], 3: ["halaqah", "Shubuh"], 4: ["motd", "apel"], 5: ["motd", "dhuha"], 6: ["halaqah", "Dhuha"],
        8: ["motd", "dzuhur"], 10: ["motd", "ashar"], 11: ["motd", "maghrib"], 13: ["motd", "isya"]}

PELANGGARAN = [  # contoh sementara, menunggu daftar resmi dari pondok
 dict(id="p1", nama="Terlambat kembali ke pondok", tingkat="Ringan", poin=5), dict(id="p2", nama="Tidak mengikuti kegiatan tanpa izin", tingkat="Ringan", poin=5),
 dict(id="p3", nama="Tidak menjaga kebersihan asrama", tingkat="Ringan", poin=3), dict(id="p4", nama="Keluar pondok tanpa izin", tingkat="Sedang", poin=15),
 dict(id="p5", nama="Membawa HP tanpa izin", tingkat="Sedang", poin=10), dict(id="p6", nama="Berkata kasar atau mencaci", tingkat="Sedang", poin=10),
 dict(id="p7", nama="Berkelahi", tingkat="Berat", poin=25), dict(id="p8", nama="Merokok", tingkat="Berat", poin=30), dict(id="p9", nama="Mencuri", tingkat="Berat", poin=40),
]

SURAH = ["Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd",
 "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Taha", "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Asy-Syu'ara'",
 "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Yasin", "As-Saffat", "Sad", "Az-Zumar", "Gafir",
 "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat", "At-Tur",
 "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadalah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun",
 "At-Tagabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir",
 "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj",
 "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr",
 "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar",
 "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"]
assert len(SURAH) == 114
Q = json.load(open("/home/claude/webapp/quran.json"))

im = Image.open("/mnt/user-data/uploads/e0ca48cf-image.png").convert("RGBA")
im.thumbnail((150, 150), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
LOGO = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

KELAS = [dict(id="7", nama="Kelas 7", pondok="29"), dict(id="8", nama="Kelas 8", pondok="29"), dict(id="9A", nama="Kelas 9A", pondok="21"), dict(id="9B", nama="Kelas 9B", pondok="21")]
D = dict(staff=STAFF, asrama=ASRAMA, kelas=KELAS, santri=SANTRI, mapel=MAPEL, jam=JAM, hari=HARI, hariHalaqah=HARI + ["Sabtu"], jadwal=JADWAL, ibadah=IBADAH, adab=ADAB, auto=AUTO,
         pelanggaran=PELANGGARAN, surah=SURAH, pages=Q["pages"], ayah=Q["ayah"], urutanJuz=ORDER)
open("/home/claude/webapp/src/data.js", "w").write("export const DATA = " + json.dumps(D, ensure_ascii=False) + ";\nexport const LOGO = " + json.dumps(LOGO) + ";\n")
print("ok", len(json.dumps(D)) // 1024, "KB data,", len(LOGO) // 1024, "KB logo")
