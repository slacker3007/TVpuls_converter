import urllib.request
import os

# FFmpeg v0.11 is much more stable for "no-build" manual setups
files = {
    "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js": "web/ffmpeg-core.js",
    "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm": "web/ffmpeg-core.wasm",
    "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js": "web/ffmpeg-core.worker.js"
}

print("--- Downloading FFmpeg v0.11 engines locally ---")

if not os.path.exists('web'):
    os.makedirs('web')

for url, path in files.items():
    print(f"Downloading {url} -> {path}...")
    try:
        urllib.request.urlretrieve(url, path)
        print("Done.")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

print("--- All v0.11 engines ready! ---")
