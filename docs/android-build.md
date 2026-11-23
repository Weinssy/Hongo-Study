# Panduan Build Android — Hongo Study

Dokumen ini menjelaskan cara menyiapkan lingkungan lokal, membangun paket Android (APK/AAB), memperbarui ikon dan splash screen, menandatangani rilis, serta memasang aplikasi **Hongo Study** (`io.github.weinssy.hongostudy`) ke perangkat Android.

---

## 1. Prasyarat Lokal

Pastikan komponen berikut terpasang di mesin pengembangan:

- **Node.js**: versi `20.19+` (seri 20) atau `22.12+` (seri 22), sesuai `engines` pada `package.json`, beserta `npm`.
- **Java JDK 21**: diperlukan oleh Gradle pada proyek Android Capacitor 8. Pastikan `JAVA_HOME` mengarah ke JDK 21 dan `java -version` menampilkan versi 21.
- **Android SDK** (`compileSdkVersion = 36`, `targetSdkVersion = 35`, `minSdkVersion = 24` pada `android/variables.gradle`): pasang melalui Android Studio atau `sdkmanager`, mencakup:
  - Android SDK Platform 36 (diperlukan oleh `androidx.core:1.17.0` dan `androidx.activity:1.11.0` pada Capacitor 8; Android SDK Platform 35 opsional untuk emulator target API 35)
  - Android SDK Build-Tools (versi 35.x atau 36.x)
  - Android SDK Platform-Tools (menyediakan `adb`)
- **Konfigurasi SDK lokal (`android/local.properties`)**:
  File ini tidak dilacak Git. Buat atau sesuaikan `android/local.properties` agar mengarah ke folder Android SDK lokal:

  ```properties
  # Windows (gunakan double backslash atau garis miring maju)
  sdk.dir=C:\\Users\\<NamaPengguna>\\AppData\\Local\\Android\\Sdk
  ```

  ```properties
  # macOS / Linux
  sdk.dir=/Users/<nama>/Library/Android/sdk
  ```

  Sebagai alternatif, definisikan variabel lingkungan `ANDROID_HOME` (atau `ANDROID_SDK_ROOT`) di sistem operasi.

---

## 2. Perbedaan Build Web vs Build Android

Hongo Study memakai satu repositori dengan dua target build Vite yang terpisah:

| Aspek | Build Web (`dist/`) | Build Android (`dist-android/`) |
| :--- | :--- | :--- |
| Perintah build | `npm run build` | `npm run build:android` (`BUILD_TARGET=android`) |
| Jumlah halaman HTML | 22 halaman (penuh) | 20 halaman inti |
| Modul 3D (`menara-jepang.html`, `japanese-tower.html`, `public/anatomy/`, `public/japanese-tower-data.js`) | Disertakan | Dikecualikan agar ukuran APK ringkas dan stabil di WebView |
| Sumber font | Google Fonts (daring) | Bundel Fontsource lokal (*Plus Jakarta Sans*, *JetBrains Mono*, *Shippori Mincho*, *Zen Kaku Gothic New*) |
| Kebutuhan jaringan | Memuat font dari CDN Google | 100% luring (*offline*), tanpa permintaan ke `fonts.googleapis.com` atau `fonts.gstatic.com` |
| Integrasi native | Di-tree-shake (0 byte Capacitor/Fontsource masuk ke `dist/`) | Capacitor 8 (tombol kembali, status bar sinkron tema, splash screen, ekspor progres via dialog bagikan) |
| Validasi otomatis | `npm run check` | `npm run check:android` (20 HTML, tautan lokal valid, bebas referensi 3D/Google Fonts, total ukuran <= 15 MB) |

---

## 3. Alur Kerja Perintah npm

Jalankan `npm install` (atau `npm ci`) terlebih dahulu setelah kloning repositori.

| Perintah | Fungsi |
| :--- | :--- |
| `npm run build:android` | Mengompilasi aset khusus Android ke direktori `dist-android/`. |
| `npm run check:android` | Memeriksa hasil `dist-android/` (jumlah halaman, tautan & fragmen lokal, bebas modul 3D & font eksternal, serta batas ukuran 15 MB). |
| `npm run cap:sync` | Menjalankan `npm run build:android` lalu menyinkronkan `dist-android/` dan plugin Capacitor ke proyek `android/`. |
| `npm run android:apk` | Menjalankan `cap:sync` lalu membangun **APK debug** flavor `github` (`assembleGithubDebug`, dengan *in-app updater*). |
| `npm run android:apk:release` | Menjalankan `cap:sync` lalu membangun **APK rilis** flavor `github` (`assembleGithubRelease`, dengan *in-app updater*). |
| `npm run android:aab` | Menjalankan `cap:sync` lalu membangun **Android App Bundle** flavor `playstore` (`bundlePlaystoreRelease`, tanpa `REQUEST_INSTALL_PACKAGES` agar patuh kebijakan Google Play). |

### Lokasi Keluaran Build

- **APK Debug (`github`)**: `android/app/build/outputs/apk/github/debug/app-github-debug.apk`
- **APK Rilis (`github`)**: `android/app/build/outputs/apk/github/release/app-github-release.apk` (atau `app-github-release-unsigned.apk` bila signing belum dikonfigurasi)
- **AAB Rilis (`playstore`)**: `android/app/build/outputs/bundle/playstoreRelease/app-playstore-release.aab`

Urutan yang disarankan sebelum membangun paket APK/AAB:

```bash
npm run build:android
npm run check:android
npm run android:apk
```

Jika Anda juga mengubah berkas HTML, CSS, atau JS bersama, jalankan `npm run check` agar build web dan batas aset beranda tetap lolos pemeriksaan.

---

## 4. Regenerasi Ikon & Splash Screen

Aset visual Android diturunkan langsung dari identitas `favicon.svg` dan `DESIGN.md` (Torii Red `#E14332`–`#C22F20`, Washi Paper `#FAF8F5`, Sumi Canvas `#121316`, dan kanji `日` putih).

1. Hasilkan 5 berkas sumber PNG resolusi tinggi di folder `resources/`:

   ```bash
   node scripts/generate-android-assets.mjs
   ```

   Perintah ini membuat:
   - `resources/icon-only.png` (1024×1024)
   - `resources/icon-foreground.png` (1024×1024, latar transparan, kanji berada di dalam zona aman 66% Adaptive Icon)
   - `resources/icon-background.png` (1024×1024)
   - `resources/splash.png` (2732×2732, latar terang `#FAF8F5`)
   - `resources/splash-dark.png` (2732×2732, latar gelap `#121316`)

2. Konversikan berkas di `resources/` ke seluruh kepadatan `mipmap-*` dan `drawable-*` di dalam `android/app/src/main/res/`:

   ```bash
   npx capacitor-assets generate --android
   ```

Jalankan ulang kedua perintah di atas setiap kali desain ikon atau warna splash screen berubah.

---

## 5. Release Keystore & Signing

Build rilis (`npm run android:apk:release` dan `npm run android:aab`) membutuhkan keystore penandatanganan agar dapat dipasang ke perangkat atau diunggah ke Google Play.

### Membuat Keystore dengan `keytool`

Jalankan `keytool` (bawaan JDK 21) untuk membuat keystore baru:

```powershell
keytool -genkeypair -v -keystore hongo-study-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias hongo-study
```

Ikuti petunjuk di terminal untuk menentukan kata sandi keystore, kata sandi alias kunci, serta informasi identitas penandatangan.

### Format `android/keystore.properties`

Buat file `android/keystore.properties` dengan struktur berikut:

```properties
storeFile=../hongo-study-release.jks
storePassword=GANTI_DENGAN_PASSWORD_KEYSTORE
keyAlias=hongo-study
keyPassword=GANTI_DENGAN_PASSWORD_KEY
```

Sesuaikan nilai `storeFile` dengan lokasi file `.jks` Anda (bisa path absolut atau relatif terhadap konfigurasi Gradle di proyek `android/`).

> **Peringatan Keamanan:** Jangan pernah meng-commit berkas keystore (`*.jks`, `*.keystore`) atau `android/keystore.properties` ke Git. Keduanya sudah tercantum di `.gitignore`, namun tetap pastikan `git status` bersih dari kredensial sebelum melakukan commit. Simpan cadangan keystore dan kata sandinya di tempat aman di luar repositori; jika keystore hilang, pembaruan aplikasi dengan ID `io.github.weinssy.hongostudy` tidak dapat ditandatangani ulang.

---

## 6. Memasang APK ke HP Android

### Opsi A — Via USB dengan `adb`

1. Aktifkan **Opsi Pengembang** (*Developer Options*) dan **USB Debugging** pada perangkat Android.
2. Hubungkan HP ke komputer melalui kabel USB, lalu setujui permintaan izin debugging di layar HP.
3. Pastikan perangkat terdeteksi:

   ```bash
   adb devices
   ```

4. Pasang atau timpa aplikasi dengan APK debug:

   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

   Untuk APK rilis yang sudah ditandatangani, ganti path file ke `android/app/build/outputs/apk/release/app-release.apk`.

### Opsi B — Transfer Manual APK

1. Salin `app-debug.apk` atau `app-release.apk` ke penyimpanan internal HP (melalui kabel USB atau metode transfer file lain).
2. Buka berkas `.apk` dari aplikasi pengelola berkas (*Files* / *My Files*) di Android.
3. Jika sistem meminta izin pemasangan dari sumber tidak dikenal (*Install unknown apps*), aktifkan izin tersebut untuk aplikasi pengelola berkas, lalu pilih **Pasang** (*Install*).

**Catatan:** Jika perangkat sudah memasang versi debug lalu Anda ingin memasang versi rilis (atau sebaliknya), hapus instalasi versi lama terlebih dahulu karena tanda tangan (*signing certificate*) keduanya berbeda.
