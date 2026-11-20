import asyncio, json, sys
from playwright.async_api import async_playwright
URL = "file:///home/claude/webapp/dist/index.html"
ACC = sys.argv[1].split(",") if len(sys.argv) > 1 else ["kaafi"]
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        pg = await b.new_page(reduced_motion="reduce", viewport={"width": 400, "height": 860}, device_scale_factor=1)
        pg.on("console", lambda m: errs.append(("console", m.type, m.text)) if m.type in ("error",) else None)
        pg.on("pageerror", lambda e: errs.append(("pageerror", str(e))))
        await pg.goto(URL); await pg.wait_for_timeout(600)
        for acc in ACC:
            await pg.evaluate("sessionStorage.clear()"); await pg.goto(URL); await pg.wait_for_timeout(400)
            await pg.fill("input[autocomplete=username]", acc); await pg.fill("input[type=password]", acc + "123")
            await pg.click("button[type=submit]"); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f"test/{acc}_home.png", full_page=True)
            n = await pg.locator(".card:has(h3:text-is('Modul')) .tile").count()
            labels = await pg.locator(".card:has(h3:text-is('Modul')) .tile .tile-lb").all_inner_texts()
            for i, lab in enumerate(labels):
                await pg.locator(".card:has(h3:text-is('Modul')) .tile").nth(i).click(); await pg.wait_for_timeout(300)
                bad = await pg.locator("text=mengalami kesalahan").count()
                await pg.screenshot(path=f"test/{acc}_{i}.png", full_page=True)
                # click every tile inside module
                sub = await pg.locator(".wrap .tiles .tile").count()
                for j in range(sub):
                    await pg.locator(".wrap .tiles .tile").nth(j).click(); await pg.wait_for_timeout(250)
                    bad2 = await pg.locator("text=mengalami kesalahan").count()
                    if bad2: errs.append(("boundary", acc, lab, j, await pg.locator(".note.red").inner_text()))
                    await pg.screenshot(path=f"test/{acc}_{i}_{j}.png", full_page=False)
                    if await pg.locator(".sub-h .back").count(): await pg.locator(".sub-h .back").first.click(); await pg.wait_for_timeout(150)
                if bad: errs.append(("boundary", acc, lab, await pg.locator(".note.red").inner_text()))
                if await pg.locator(".sub-h .back").count(): await pg.locator(".sub-h .back").first.click(); await pg.wait_for_timeout(150)
                # ensure home
                await pg.locator(".bnav button").first.click(); await pg.wait_for_timeout(150)
            for k in range(1, 5):
                await pg.locator(".bnav button").nth(k).click(); await pg.wait_for_timeout(250)
                if await pg.locator("text=mengalami kesalahan").count(): errs.append(("boundary-tab", acc, k))
            print(acc, "tiles:", labels)
        await b.close()
    print("ERRORS:", json.dumps(errs, indent=1, ensure_ascii=False)[:4000])
asyncio.run(main())
