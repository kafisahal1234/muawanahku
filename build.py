import subprocess, sys
r = subprocess.run(["npx", "esbuild", "src/main.js", "--bundle", "--format=iife", "--minify", "--target=es2019", "--outfile=dist/app.js"], capture_output=True, text=True)
print(r.stdout, r.stderr)
if r.returncode: sys.exit(1)
css = open("src/theme.css").read() + open("src/skin.css").read()
js = open("dist/app.js").read().replace("</script", "<\\/script")
html = f"""<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#0B5D3B">
<title>MuawanahKu · Demo Aplikasi</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div id="root"></div><script>{js}</script></body></html>"""
open("dist/index.html", "w").write(html)
print("ok", len(html) // 1024, "KB")
