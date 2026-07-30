pluginManagement {
    val flutterSdkPath = run {
        val properties = java.util.Properties()
        file("local.properties").inputStream().use { properties.load(it) }
        val flutterSdkPath = properties.getProperty("flutter.sdk")
        require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
        flutterSdkPath
    }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    // R7 real-device verification (docs/roadmap/OPEN_ITEMS_AFTER_MVP.md,
    // R3-4) — 8.7.3 had never actually been build-tested; a real
    // `flutter build apk` reported androidx.core:core 1.17.0 (pulled in
    // transitively by geolocator/maplibre_gl/package_info_plus) requires
    // AGP 8.9.1+. 8.9.1 is the documented minimum from that error, not an
    // arbitrary bump.
    id("com.android.application") version "8.9.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
}

include(":app")
