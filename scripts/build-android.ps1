$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
if (!$env:JAVA_HOME) { throw 'Set JAVA_HOME to JDK 17.' }
if (!$env:ANDROID_HOME) { throw 'Set ANDROID_HOME to the Android SDK directory.' }
$env:Path = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/platform-tools;$env:Path"
$env:NODE_ENV = 'production'
Push-Location $project
try {
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
    $sdkPath = $env:ANDROID_HOME.Replace('\','/')
    Set-Content -Encoding ascii android/local.properties "sdk.dir=$sdkPath"
    Push-Location android
    try {
        & ./gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --console=plain --max-workers=2
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force build | Out-Null
    Copy-Item android/app/build/outputs/apk/release/app-release.apk build/Ozon-Coffee.apk
    Write-Output "APK: $project/build/Ozon-Coffee.apk"
} finally { Pop-Location }
