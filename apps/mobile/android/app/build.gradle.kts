plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.novaway.mobile"
    // R7 real-device verification — `flutter.compileSdkVersion`/
    // `.ndkVersion` resolve to whatever this Flutter SDK install's bundled
    // default is (35 / 26.3.11579264 for 3.32.5 stable), which is older
    // than what the currently-pinned plugin versions actually need now
    // (maplibre_gl needs compileSdk 36; geolocator_android/maplibre_gl/
    // package_info_plus need NDK 27-28.x). Hardcoded to the exact versions
    // `flutter build apk`'s own error output named as sufficient — this
    // build had never actually been run before, so these were never caught.
    compileSdk = 36
    ndkVersion = "28.1.13356709"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.novaway.mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // R7 real-device verification — `flutter.minSdkVersion` resolves to 21
        // for this Flutter SDK install, but the real Gradle manifest merger
        // rejected that: maplibre_gl's android-sdk-opengl 13.3.0 declares
        // minSdk 23 (uses APIs unavailable below it). 23 is the exact floor
        // that error named, not an arbitrary bump.
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
