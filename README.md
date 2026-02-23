# BizLedger — Aronium POS Report Viewer

A mobile & desktop app for viewing Aronium POS business reports from SQLite database files. Load your POS database synced from Google Drive, OneDrive, or Dropbox and instantly view stock, customer, and supplier reports.

---

## 🖥️ Running on Your PC (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [Git](https://git-scm.com/)

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd bizledger

# 2. Install dependencies
npm install

# 3. Start both the server and the Expo app together
npm run dev
```

This runs:
- **Express server** on `http://localhost:5000`
- **Expo app** on `http://localhost:8081` (opens in your browser)

The app will automatically connect to `http://localhost:5000` — no env vars needed for local dev.

### Running separately (optional)
```bash
# Terminal 1 — API server
npm run server:dev

# Terminal 2 — Expo app
npm run expo:dev:local
```

---

## 📱 Running on iOS / Android (Physical Device)

### Prerequisites
- Install **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Your PC and phone must be on the **same Wi-Fi network**

```bash
# 1. Start the server
npm run server:dev

# 2. In a new terminal, find your PC's local IP address
#    Windows: ipconfig
#    Mac/Linux: ifconfig or ip addr

# 3. Set the API URL to your PC's IP and start Expo
EXPO_PUBLIC_API_URL=http://192.168.1.X:5000 npm run expo:dev

# 4. Scan the QR code with Expo Go (Android) or Camera app (iOS)
```

---

## 🏪 Building for App Store / Play Store

### Prerequisites
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- Expo account: `eas login`

### Before building
1. Edit `eas.json` — replace `https://your-server.com` with your deployed server URL
2. Edit `app.json` — update `ios.bundleIdentifier` and `android.package` to your own unique IDs

### Build commands

```bash
# iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Android APK (for direct install / testing)
eas build --platform android --profile preview

# Android (for Google Play Store)
eas build --platform android --profile production

# Both platforms at once
eas build --platform all --profile production
```

### Submit to stores
```bash
# iOS App Store
eas submit --platform ios --profile production

# Google Play Store
eas submit --platform android --profile production
```

---

## 🗄️ Database Setup

The app reads **Aronium POS** SQLite `.db` files. The database file is:
- **Read-only** — the app never modifies your data
- **Never shared** — stays on your server only
- **Synced from cloud** — use Google Drive, OneDrive, or Dropbox to keep it up to date on your PC, then load it in the app

### Loading a database
1. Sync your Aronium POS `.db` file from your cloud drive to your phone
2. Open the app → tap **Select Database File**
3. Browse to your `.db` file and select it

### Sample database
A sample database is included at `attached_assets/pos_*.db` for testing.

---

## 🌐 Deploying the Server

For production use (so your phone can connect without being on the same Wi-Fi):

1. Deploy the Express server to any Node.js host (Railway, Render, DigitalOcean, etc.)
2. Set `EXPO_PUBLIC_API_URL=https://your-server.com` in `eas.json`
3. Set `ALLOWED_ORIGINS=https://your-expo-app-origin.com` on the server
4. Rebuild the app with `eas build`

---

## 📁 Project Structure

```
app/
  _layout.tsx              Root layout
  index.tsx                Welcome / file picker screen
  (tabs)/
    _layout.tsx            Tab bar layout
    index.tsx              Dashboard
    stock.tsx              Stock Report
    customers.tsx          Customer Report
    suppliers.tsx          Supplier Report

server/
  index.ts                 Express server
  routes.ts                API endpoints
  db.ts                    SQLite database management

lib/
  query-client.ts          React Query client & API helpers
  company.ts               Company info hook (reads from DB)
  format.ts                Number & date formatting

constants/
  colors.ts                Theme colours
```

---

## 🛠️ Tech Stack

- **Frontend**: Expo (React Native) + Expo Router
- **Backend**: Express.js (Node.js)
- **Database**: SQLite via better-sqlite3 (read-only)
- **State**: TanStack React Query
- **Build**: EAS Build (Expo Application Services)
---

## ⚙️ Settings Screen

Access the Settings screen from the gear icon (⚙️) on the Dashboard.

The Settings screen shows:
- **Company info** — name, address, phone, email, tax number (read from your DB)
- **Change Database File** — load a different `.db` file without restarting
- **Go to Welcome Screen** — return to the file picker
- **Clear Data Cache** — force a fresh reload of all data

---

## 📋 Reports Available

| Report | Description |
|--------|-------------|
| Sales | Monthly revenue breakdown + top products |
| Purchases | Monthly purchase breakdown + top suppliers |
| Payments | Cash vs Card vs other payment methods |
| P&L | Gross Profit = Revenue − COGS, with margin % |
| Voids | Cancelled/voided transaction history |
| Z-Report | Daily closing records with per-session totals |
| Inventory | Inventory count history + Loss & Damage records |

All reports can be exported as **PDF** and shared via email, WhatsApp, or saved to Files.

---

## 📄 Document Line Items

On the Customer or Supplier detail screen, tap any document row to **expand it** and see the individual products on that invoice, including quantity, unit price, discount, line total, and per-document gross profit calculation.
