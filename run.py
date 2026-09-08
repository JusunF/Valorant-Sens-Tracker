#!/usr/bin/env python3
"""
Starts a local server for this folder and opens it in your default browser.

Usage:
    python3 run.py
    (or just double-click this file on Windows if .py files are
     associated with Python)
"""
import http.server
import socketserver
import webbrowser
import threading
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser():
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving {DIRECTORY} at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        threading.Timer(0.5, open_browser).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")