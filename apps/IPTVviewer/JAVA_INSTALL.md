# How to Install Java for Android Development

## Step 1: Download Java JDK 17

Go to this link and download the file:
https://adoptium.net/temurin/releases/

Click on **Windows x64 MSI** under **JDK 17 (LTS)**

## Step 2: Run the Installer

1. Double-click the downloaded `.msi` file
2. Click **Next** through all the defaults
3. **IMPORTANT**: Don't change the install location

The default location is:
`C:\Program Files\Eclipse Adoptium\jdk-17.0.10.7-hotspot`

## Step 3: Verify Installation

Open a **NEW** PowerShell window and run:

```bash
java -version
```

You should see:
```
openjdk version "17.0.x" 2023-xx-xx
Eclipse Adoptium <runtime name, architecture> 64-Bit VM
```

## Step 4: Set JAVA_HOME (Optional - Usually Auto-Set)

If `java -version` works, you're good!

If not, run this in PowerShell as Administrator:

```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.10.7-hotspot", "Machine")
```

Then restart PowerShell.

## Step 5: Build Your App

```bash
cd android
.\gradlew.bat assembleRelease
```

---

## Troubleshooting

**"java is not recognized"**
- Close PowerShell and open a NEW one after installing Java
- The PATH variable updates in new terminals

**Wrong Java version?**
- React Native requires JDK 17
- Don't use JDK 8, 11, or 21 - those won't work

**Can't find java.exe?**
- Check: `C:\Program Files\Eclipse Adoptium\jdk-17.0.10.7-hotspot\bin\java.exe`
