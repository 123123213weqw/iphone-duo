#!/usr/bin/env python3
"""Screenshot the iPhone Duo viewer headlessly (Playwright + Chromium WebGL)."""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = "http://127.0.0.1:8791/index.html"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="renders/shot.png")
    ap.add_argument("--fold", type=float, default=180)
    ap.add_argument("--view", default="hero", choices=["hero", "front", "back", "custom"])
    ap.add_argument("--cam", default="96,46,318")
    ap.add_argument("--finish", default="starwhite", choices=["starwhite", "silver"])
    ap.add_argument("--dims", action="store_true")
    ap.add_argument("--spin", action="store_true")
    ap.add_argument("--ui", action="store_true", help="include the HTML overlay")
    ap.add_argument("--clean", action="store_true", help="hide every HTML overlay")
    ap.add_argument("--size", default="1600x1000")
    ap.add_argument("--dpr", type=float, default=2)
    ap.add_argument("--wait", type=int, default=900)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    w, h = (int(v) for v in args.size.lower().split("x"))
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)

    logs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--ignore-gpu-blocklist",
                "--use-angle=metal",
                "--hide-scrollbars",
            ],
        )
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=args.dpr)
        page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
        page.goto(URL, wait_until="load")
        page.wait_for_function("window.__duoReady === true", timeout=45000)
        page.evaluate(
            """([fold, finish, dims, spin]) => {
                window.__duo.setFold(fold);
                window.__duo.setFinish(finish);
                window.__duo.setDims(dims);
                window.__duo.setSpin(spin);
            }""",
            [args.fold, args.finish, args.dims, args.spin],
        )
        if args.view == "custom":
            cam = [float(v) for v in args.cam.split(",")]
            page.evaluate("(c) => window.__duo.flyTo(c, [0,0,0], 1)", cam)
        else:
            page.evaluate("(v) => window.__duo.setView(v)", args.view)
        if args.clean:
            page.evaluate("() => document.querySelectorAll('.top,.hint,.dock').forEach(e => e.style.display='none')")
        page.wait_for_timeout(args.wait)
        dims = page.evaluate("() => window.__duo.getDims()")
        if args.ui:
            page.screenshot(path=str(out))
        else:
            page.locator("#viewport canvas").screenshot(path=str(out))
        browser.close()

    errors = [l for l in logs if l.startswith(("pageerror", "error"))]
    if args.json:
        print(json.dumps({"out": str(out), "dims": dims, "errors": errors, "logs": logs[-20:]}, indent=2))
    else:
        print(f"{out}  dims={dims}")
        for l in logs[-8:]:
            print("  ", l)
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
