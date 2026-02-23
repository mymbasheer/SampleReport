@echo off
:: Generate a release keystore for signing the Android APK (Windows)
SET KEYSTORE_FILE=bizledger-release.keystore
SET KEY_ALIAS=bizledger

echo.
echo ============================================
echo   BizLedger -- Generate Release Keystore
echo ============================================
echo.

IF EXIST "%KEYSTORE_FILE%" (
    echo WARNING: %KEYSTORE_FILE% already exists.
    echo Delete it first to regenerate.
    pause
    exit /b 0
)

echo You will be asked for a password and your details.
echo Remember the password - you need it to sign every build!
echo.

keytool -genkeypair ^
    -v ^
    -storetype PKCS12 ^
    -keystore "%KEYSTORE_FILE%" ^
    -alias "%KEY_ALIAS%" ^
    -keyalg RSA ^
    -keysize 2048 ^
    -validity 10000

IF EXIST "%KEYSTORE_FILE%" (
    echo.
    echo SUCCESS: Keystore generated: %KEYSTORE_FILE%
    echo.
    echo IMPORTANT - Add these lines to android\gradle.properties:
    echo.
    echo MYAPP_RELEASE_STORE_FILE=..\..\bizledger-release.keystore
    echo MYAPP_RELEASE_KEY_ALIAS=%KEY_ALIAS%
    echo MYAPP_RELEASE_STORE_PASSWORD=your_password_here
    echo MYAPP_RELEASE_KEY_PASSWORD=your_password_here
    echo.
    echo WARNING: Never share or commit the .keystore file!
)
pause
