import http.server
import socketserver
import webbrowser
import threading
import time

PORT = 8000
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

def open_browser():
    time.sleep(1) # Wait for server to start
    print(f"Opening browser at http://localhost:{PORT}...")
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == '__main__':
    threading.Thread(target=open_browser, daemon=True).start()
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 TVpuls Dev Server running at: http://localhost:{PORT}")
        print("Keep this window open while using the app.")
        httpd.serve_forever()
