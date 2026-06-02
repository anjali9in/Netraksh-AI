# Use Android Studio JDK 21 (system Java 25 breaks Gradle)
$env:JAVA_HOME = "D:\application and software\android studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Set-Location $PSScriptRoot
.\gradlew.bat --stop 2>$null
.\gradlew.bat assembleDebug @args

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "APK: $PSScriptRoot\app\build\outputs\apk\debug\app-debug.apk"
}
