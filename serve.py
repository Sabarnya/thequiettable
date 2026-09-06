#!/usr/bin/env python3
# serve.py — preview The Quiet Table on a local server.
# Put this file INSIDE the quiet-table folder (next to index.html), then run it.
# It always serves the folder it lives in, so "file not found" from being in the
# wrong directory can't happen. Opens your browser automatically. Ctrl+C to stop.

import http.server, socketserver, os, webbrowser, threading

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))  # serve THIS folder

if not os.path.exists("index.html"):
    print("! index.html is not next to serve.py.")
    print("  Move serve.py into the quiet-table folder (the one with index.html) and run again.")
    raise SystemExit(1)

socketserver.TCPServer.allow_reuse_address = True
threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}/index.html")).start()

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"The Quiet Table is live at  http://localhost:{PORT}/")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
