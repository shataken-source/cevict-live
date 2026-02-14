# Fix: gradlew.bat not found

The error means the Android Gradle wrapper isn't installed in your project.

## Quick Fix - Run from Android Directory:

```bash
cd android
gradlew.bat.bat assembleRelease
cd ..
```

## Or Install Gradle Wrapper:

```bash
cd android
gradle wrapper
cd ..
```

## Alternative - Run with global Gradle:

```bash
cd android
gradle assembleRelease
cd ..
```

## Check if Gradle is installed:

```bash
gradle --version
```

If not installed, download from https://gradle.org/releases/

---

## Easiest Solution - Just cd into android:

```bash
cd android
..\..\npm run android
```

Or on Windows:
```bash
cd android
cd ..
npm run android
```

The `npm run android` script should automatically use the gradlew in the android folder, but sometimes the PATH isn't set correctly.

---

## If Nothing Works - Create Release APK Manually:

1. Download Gradle from https://gradle.org/releases/
2. Extract to `C:\Gradle`
3. Add `C:\Gradle\bin` to System PATH
4. Restart terminal
5. Run:
```bash
cd android
gradle.bat assembleRelease
