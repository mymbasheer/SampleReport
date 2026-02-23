# 🚀 How to Build APK Using GitHub (Free)

GitHub will automatically build your APK every time you push code.
No Android Studio needed on your PC. Completely free.

---

## 📋 What You Need

- A free GitHub account → https://github.com
- Git installed on your PC → https://git-scm.com
- Node.js installed → https://nodejs.org

---

## 🔧 One-Time Setup

### Step 1 — Create a GitHub Repository

1. Go to **https://github.com/new**
2. Repository name: `Aronium-POS-Report`
3. Set to **Private** (recommended — your business data)
4. Click **Create repository**

### Step 2 — Push the code to GitHub

Open Command Prompt / Terminal inside the project folder:

```bash
cd Aronium-POS-Report

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/Aronium-POS-Report.git
git branch -M main
git push -u origin main
```

That's it! GitHub will **automatically start building your APK**.

---

## ⬇️ Download Your APK

1. Go to your repository on GitHub
2. Click the **Actions** tab at the top
3. Click the latest **"Build Android APK"** workflow run
4. Wait for it to finish (green ✅) — takes about **10–15 minutes**
5. Scroll down to **Artifacts**
6. Click **Aronium-POS-Report-1** to download the APK zip
7. Unzip it → you get `app-release.apk`
8. Send the APK to your Android phone and install it!

---

## 🔄 Every Future Build

Whenever you make changes and push to GitHub:

```bash
git add .
git commit -m "Updated reports"
git push
```

GitHub automatically builds a new APK. No extra steps needed.

---

## 📱 Installing the APK on Android

1. Send the `.apk` file to your phone
   - Email it to yourself, or
   - Upload to Google Drive and open on phone, or
   - Connect via USB and copy the file

2. Open the `.apk` file on your phone

3. If prompted:
   - Go to **Settings → Security**
   - Enable **"Install from unknown sources"** or **"Install unknown apps"**
   - Tap **Install**

---

## 🌐 Setting Your Server URL (Important!)

The app needs to connect to your Express server (the backend).

If you're running the server on your PC and using the app on your phone
(both on same Wi-Fi):

```bash
# Find your PC's IP address:
# Windows: ipconfig → look for IPv4 Address
# Mac/Linux: ifconfig → look for inet

# Example: 192.168.1.100
```

Add a **GitHub Secret** so the APK knows your server address:

1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_PUBLIC_API_URL`
5. Value: `http://192.168.1.100:5000` (your PC's IP)
6. Click **Add secret**
7. Push any change to trigger a new build with the updated URL

---

## 📊 GitHub Actions — What's Happening

Each build runs these steps automatically:

| Step | What it does |
|------|-------------|
| Checkout | Downloads your code |
| Node.js setup | Installs Node 20 |
| Java setup | Installs Java 17 |
| Android SDK | Sets up Android build tools |
| npm install | Installs JS packages |
| expo prebuild | Generates native Android project |
| Gradle build | Compiles the APK |
| Upload artifact | Makes APK downloadable |

---

## ❓ Troubleshooting

**Build failed — red ✗**
- Click the failed workflow run
- Click the failed step to see the error message
- Most common fix: push the code again (sometimes it's a flaky network issue)

**APK installs but can't connect to server**
- Make sure your server is running (`npm run dev` on your PC)
- Make sure phone and PC are on the same Wi-Fi
- Check the `EXPO_PUBLIC_API_URL` secret is set correctly

**"App not installed" error on phone**
- Uninstall any previous version first
- Make sure "Install unknown sources" is enabled

---

*BizLedger — Aronium POS Report Viewer*
