# Ubuntu (Linux) Usage Notes

This project is an Electron app.

## Install (Dependencies)

Ubuntu usually needs the following runtime libraries for Electron apps:

```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  libasound2 \
  libgbm1 \
  libgtk-3-0

If your Ubuntu version does not provide `libasound2` (e.g. newer releases), install the `t64` variant instead:

```bash
sudo apt-get install -y libasound2t64
```
```

## Run (Dev)

```bash
npm ci
npm run dev
```

## Package (Linux)

Build a Debian package:

```bash
npm ci
npm run pack:linux
```

Install the generated `.deb`:

```bash
sudo dpkg -i release/*.deb
```

## OCR + Screenshot Notes

- Screen capture uses `getDisplayMedia`. On Wayland, it typically goes through PipeWire + xdg-desktop-portal.
- If the capture picker does not show up or capture fails on Wayland, try logging into an X11 session and retry.
- OCR downloads language data on first use (network required).

## Shortcuts Notes

- Note shortcuts are **in-note** shortcuts (require focus in the note window), not global OS shortcuts.
- On Linux, `Mod` maps to `Ctrl` for the default shortcuts.
