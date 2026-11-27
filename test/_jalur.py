# Jalur bersama untuk skrip uji (tidak bergantung lokasi repo).
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = str(ROOT / "dist")
URL_DIST = (ROOT / "dist" / "index.html").as_uri()
OUT = ROOT / "test" / "out"          # hasil tangkapan layar & file uji (diabaikan git)
OUT.mkdir(parents=True, exist_ok=True)
# Akun uji lokal (data contoh di test/contoh/seed.json, BUKAN data asli):
#   guru/pengurus  : <username> / <username>123   (mis. syamsul / syamsul123)
#   admin          : admin123 / contoh123
ADMIN = ("admin123", "contoh123")
