import struct, zlib, os

def create_png(width, height, r, g, b):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        raw += bytes([r, g, b]) * width

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')

    return sig + ihdr + idat + iend

screens = [
    ("auth", "login.png", 390, 844, 30, 30, 50),
    ("tabs", "feed.png", 390, 844, 20, 60, 120),
    ("tabs", "momentos.png", 390, 844, 120, 30, 80),
    ("tabs", "biblioteca.png", 390, 844, 20, 80, 60),
    ("tabs", "conta.png", 390, 844, 80, 40, 20),
    ("tabs", "ajustes.png", 390, 844, 40, 40, 80),
    ("tabs", "explorer-tab.png", 1280, 800, 10, 20, 40),
    ("tabs", "3d-studio-tab.png", 1280, 800, 20, 10, 40),
    ("tabs", "modos.png", 390, 844, 60, 20, 80),
    ("stack", "stem-extractor.png", 390, 844, 100, 50, 20),
    ("stack", "daw-studio.png", 1280, 800, 30, 30, 60),
    ("stack", "mastering-suite.png", 1280, 800, 40, 20, 50),
    ("creative", "beatmaker.png", 1280, 800, 50, 80, 120),
    ("creative", "synth-lab.png", 1280, 800, 100, 20, 100),
    ("creative", "mixing-console.png", 1280, 800, 40, 60, 90),
    ("creative", "dj-stage.png", 1280, 800, 120, 40, 60),
    ("creative", "autotune.png", 1280, 800, 30, 100, 70),
    ("creative", "live-room.png", 1280, 800, 80, 100, 40),
    ("creative", "spatial-audio.png", 1280, 800, 20, 50, 100),
    ("creative", "stem-collider.png", 1280, 800, 100, 30, 50),
    ("creative", "lofi-tape.png", 1280, 800, 60, 40, 30),
    ("creative", "acoustics-lab.png", 1280, 800, 40, 80, 100),
    ("creative", "cover-jam.png", 1280, 800, 80, 60, 120),
    ("creative", "vocal-booth.png", 1280, 800, 50, 50, 80),
    ("creative", "explorer-missao.png", 1280, 800, 10, 40, 30),
]

base = os.path.dirname(os.path.abspath(__file__))

for folder, name, w, h, r, g, b in screens:
    path = os.path.join(base, "screenshots", folder, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    png_data = create_png(w, h, r, g, b)
    with open(path, "wb") as f:
        f.write(png_data)
    print(f"Created {path} ({w}x{h})")

print("\nDone — generated all screenshot placeholders.")
