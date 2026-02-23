@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: BizLedger — Local Android APK Build Script (Windows)
:: Double-click this file or run from Command Prompt
:: ─────────────────────────────────────────────────────────────────────────────

echo.
echo ============================================
echo   BizLedger -- Android APK Build (Windows)
echo ============================================
echo.

:: Step 1: Check Node.js
echo [1/5] Checking Node.js...
node -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Node.js not found.
    echo Install from https://nodejs.org ^(choose LTS^)
    pause
    exit /b 1
)
FOR /F "tokens=*" %%i IN ('node -v') DO SET NODE_VER=%%i
echo OK: Node.js %NODE_VER%

:: Step 2: Check Java
echo [2/5] Checking Java...
java -version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Java not found.
    echo Install Java 17 from https://adoptium.net
    echo Or run: winget install Microsoft.OpenJDK.17
    pause
    exit /b 1
)
echo OK: Java found

:: Step 3: Check ANDROID_HOME
echo [3/5] Checking Android SDK...
IF "%ANDROID_HOME%"=="" (
    IF "%ANDROID_SDK_ROOT%"=="" (
        echo ERROR: ANDROID_HOME not set.
        echo.
        echo Install Android Studio from https://developer.android.com/studio
        echo Then set ANDROID_HOME in System Environment Variables:
        echo   Variable: ANDROID_HOME
        echo   Value:    %%LOCALAPPDATA%%\Android\Sdk
        echo.
        echo After setting, restart Command Prompt and run this script again.
        pause
        exit /b 1
    )
)
echo OK: Android SDK found

:: Step 4: Run prebuild if needed
echo [4/5] Checking native Android project...
IF NOT EXIST "android\" (
    echo android\ folder not found. Running expo prebuild...
    call npx expo prebuild --platform android --no-install
    IF ERRORLEVEL 1 (
        echo ERROR: expo prebuild failed.
        pause
        exit /b 1
    )
    echo OK: Native project generated
) ELSE (
    echo OK: android\ folder exists
)

:: Step 5: Build APK
echo [5/5] Building APK ^(this takes 5-10 minutes^)...
echo.
cd android
call gradlew.bat assembleRelease
IF ERRORLEVEL 1 (
    echo.
    echo ERROR: Gradle build failed. Check errors above.
    cd ..
    pause
    exit /b 1
)
cd ..

:: Done
SET APK_PATH=android\app\build\outputs\apk\release\app-release.apk
IF EXIST "%APK_PATH%" (
    echo.
    echo ============================================
    echo   SUCCESS! APK built successfully!
    echo ============================================
    echo.
    echo   APK location:
    echo   %CD%\%APK_PATH%
    echo.
    echo   To install on Android phone:
    echo   1. Copy the APK file to your phone ^(USB or WhatsApp to yourself^)
    echo   2. Open the APK on your phone
    echo   3. If prompted, enable "Install from unknown sources"
    echo      Settings ^> Security ^> Install unknown apps
    echo.
    :: Open the folder containing the APK
    explorer android\app\build\outputs\apk\release\
) ELSE (
    echo ERROR: APK not found. Build may have failed.
)

pause
