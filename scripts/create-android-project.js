import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function generateAndroidProjectZip() {
  const zip = new JSZip();
  const rootDir = process.cwd();

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.thennarasug.geocampro">

    <!-- Hardware Camera & Geolocation Permissions for GeoCam Pro -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="GeoCam Pro"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="GeoCam Pro"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const mainActivityJava = `package com.thennarasug.geocampro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}`;

  const capacitorConfig = `{
  "appId": "com.thennarasug.geocampro",
  "appName": "GeoCam Pro",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app",
    "cleartext": true
  }
}`;

  const appBuildGradle = `apply plugin: 'com.android.application'

android {
    namespace "com.thennarasug.geocampro"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.thennarasug.geocampro"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core-ktx:1.12.0'
}`;

  const topBuildGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}`;

  const buildGuideMd = `# GeoCam Pro - Android APK Build Guide
Target User: @thennarasug (thennarasugr@gmail.com)
App: GeoCam Pro - GPS Geotag Camera APK

## Method 1: Instant Cloud APK Generation (No Setup Needed)
1. Visit: https://www.pwabuilder.com/reportcard?site=https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app
2. Click **"Generate Package"** -> select **"Android"**.
3. Download the signed **.apk** file directly to your phone or PC!

## Method 2: Native Android WebAPK (Install in 5 Seconds)
1. Open https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app in Chrome on Android.
2. Tap the **"Install App"** prompt (or 3-dots ⋮ -> "Install App").
3. Android Google Play services automatically compiles a real native WebAPK into your phone's app drawer!

## Method 3: Build APK with Android Studio / Gradle
1. Unzip this folder.
2. Open in Android Studio, or in terminal run:
   \`\`\`bash
   ./gradlew assembleDebug
   \`\`\`
3. Your compiled APK will be created at:
   \`app/build/outputs/apk/debug/app-debug.apk\`
4. Install to Android via ADB:
   \`\`\`bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   \`\`\`
`;

  // Add files to zip
  zip.file('BUILD_APK_GUIDE.md', buildGuideMd);
  zip.file('capacitor.config.json', capacitorConfig);
  zip.file('android/build.gradle', topBuildGradle);
  zip.file('android/settings.gradle', "include ':app'");
  zip.file('android/app/build.gradle', appBuildGradle);
  zip.file('android/app/src/main/AndroidManifest.xml', manifestXml);
  zip.file('android/app/src/main/java/com/thennarasug/geocampro/MainActivity.java', mainActivityJava);

  // Add icon if exists
  const iconPath = path.join(rootDir, 'public', 'pwa-512x512.png');
  if (fs.existsSync(iconPath)) {
    zip.file('android/app/src/main/res/drawable/ic_launcher.png', fs.readFileSync(iconPath));
  }

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.join(rootDir, 'public', 'geocam-pro-android-project.zip');
  fs.writeFileSync(outPath, content);
  console.log(`Android project zip written to: ${outPath} (${(content.length / 1024).toFixed(1)} KB)`);
}

generateAndroidProjectZip().catch(console.error);
