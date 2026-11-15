"""Presentation shots of the 3D terrain view: headless Microsoft Edge (WebGL via SwiftShader) on the ?embed=3d page.

Run from the repository root with the web app served (npm --prefix web run dev, or a preview of the built site):
    python qgis/scripts/export_3d_views.py [base_url]
Every view is a URL (scene, period, camera, exaggeration, layers), so each image can be reproduced and checked in the app.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173/trend-detective-lab/"
A, L, P = ROOT / "qgis" / "exports_3d" / "antofagasta", ROOT / "qgis" / "exports_3d" / "los_lagos", ROOT / "docs" / "presentation" / "assets_3d"
VIEWS = [  # (file, query)
    (A / "terrain_preview.png", "cam=coast&cells=0&sst=0"),
    (A / "climate_overlay.png", "cam=overview&period=1980-2025&sst=0"),
    (A / "coastal_comparison.png", "cam=coast&period=1980-2025&sst=0"),
    (A / "period_1980_2002.png", "cam=coast&period=1980-2002&sst=0"),
    (A / "period_2003_2025.png", "cam=coast&period=2003-2025"),
    (A / "exaggeration_1x.png", "cam=coast&cells=0&sst=0&exag=1"),
    (L / "terrain_preview.png", "scene=los_lagos&cam=overview&cells=0"),
    (L / "land_cover.png", "scene=los_lagos&cam=overview&cells=0&tex=landcover"),
    (L / "soil_moisture.png", "scene=los_lagos&cam=overview&tex=landcover"),
]


def main():
    prof = Path(tempfile.mkdtemp(prefix="edge3d-"))
    for out, q in VIEWS:
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([EDGE, "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", f"--user-data-dir={prof}",
                        "--hide-scrollbars", "--window-size=1400,1000", "--virtual-time-budget=25000", f"--screenshot={out}",
                        f"{BASE}?embed=3d&shot&{q}"], check=True, capture_output=True, timeout=180)
        print(out.relative_to(ROOT), out.stat().st_size)


if __name__ == "__main__":
    main()
