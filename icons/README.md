# Icons Directory

This directory should contain the application icons in various formats:

- **32x32.png** - 32x32 pixel PNG icon
- **128x128.png** - 128x128 pixel PNG icon
- **128x128@2x.png** - 256x256 pixel PNG icon (2x retina)
- **icon.ico** - Windows ICO format (contains multiple sizes)
- **icon.icns** - macOS ICNS format

You can generate these icons using online tools like:
- https://favicon.io/
- https://www.icoconverter.com/
- https://icon.kitchen/

For a quick start, you can use Tauri's icon generation:
```bash
cargo install tauri-cli --version "^2.0.0"
cargo tauri icon path/to/your/icon.png
```

This will automatically generate all required icon formats.
