# GeoCam Pro — GPS Geotagging Camera (Android APK & PWA)

> **Author**: [thennarasug](https://github.com/thennarasug)  
> **Contact**: thennarasugr@gmail.com  
> **Live Applet**: [https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app](https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app)

---

## 📱 Mobile APK Test & Installation

GeoCam Pro is packaged as an installable **Progressive Web App (PWA) / Android WebAPK** with native Android manifest integration:

1. On your Android phone, open **Google Chrome** or **Samsung Internet**.
2. Navigate to:  
   `https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app`  
   *(or scan the QR code displayed inside the GeoCam Pro app)*
3. An **"Install App"** / **"Add GeoCam to Home screen"** prompt will appear.
4. Tap **Install** — Android will automatically build and install the native WebAPK into your phone's app drawer!
5. Launch GeoCam Pro from your home screen — it runs in **standalone full-screen mode** with hardware camera access, offline satellite GPS tracking, and no browser address bar.

---

## ✨ Key Features

- **Embedded Map Snippets on Photos**: Burns a real-time mini-map tile directly onto the photo watermark alongside coordinate telemetry and street address.
- **100% Offline Geotagging**: Stores raw satellite GPS coordinates locally in IndexedDB when in remote field sites without cellular service.
- **Automatic Reconnection Sync**: Reverse-geocodes street addresses and updates photo watermarks automatically once internet connectivity is restored.
- **Continuous GPS Breadcrumb Track**: Records high-accuracy GPS breadcrumbs every 15 seconds to trace your field inspection path.
- **Native Web Share API**: 1-click export of geotagged photos with full metadata directly to WhatsApp, Telegram, Gmail, AirDrop, and Drive.
- **Live Viewfinder Telemetry HUD**:
  - Live Horizon Bubble Level (pitch & roll device tilt angles)
  - Live 16-point Compass Bearing & Direction
  - Reticle & Rule of Thirds Framing Grids
  - Multi-format Coordinates: Decimal Degrees (DD), DMS (Degrees Minutes Seconds), and UTM (Universal Transverse Mercator)
  - Synthesized dual-click mechanical camera shutter sound (Web Audio API) and haptic tactile vibration
- **Interactive Leaflet Map Explorer**: Pins all captured photos as interactive thumbnail markers.
- **Batch ZIP & CSV Export**: 1-click download of all high-resolution photos and an accompanying `survey_report.csv` metadata spreadsheet.

---

## 🚀 Pushing to your GitHub Account (`thennarasug`)

To publish this project to your GitHub repository:

```bash
# 1. Create a new repository on GitHub named "geocam-pro"
# https://github.com/new

# 2. Add your GitHub remote
git remote add origin https://github.com/thennarasug/geocam-pro.git

# 3. Rename branch to main
git branch -M main

# 4. Push your commits
git push -u origin main
```

*(If using a GitHub Personal Access Token or SSH keys, ensure your git credentials are configured)*

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build
```

---

## 📄 License

Apache-2.0 © 2026 thennarasug
