# Safar-e-Shahadat 2026 Android App

Android Java WebView wrapper for the public Poh Samagam website and embedded public Gurbani Sangat View.

- **Samagam** shows the live website with upcoming programs, multilingual announcements, YouTube live, call/WhatsApp and admin interface.
- **Sangat View** is opened in the **same Android WebView**, never launching an external browser for this view.
- Other external destinations like Maps, WhatsApp and YouTube may open their corresponding apps.
- Requires an internet connection for current broadcasts.

## Build

GitHub Actions workflow `Build Safar-e-Shahadat APK` assembles a debug-signed installable APK using JDK 17, Gradle 8.9, Android SDK 35. The workflow artifact is named `Safar-e-Shahadat-2026-APK`.

This is a debug build for personal distribution; public Play Store release requires dedicated production signing and store review.
