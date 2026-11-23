package io.github.weinssy.hongostudy;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final int MAX_REDIRECTS = 5;
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 30000;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean(false);

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", BuildConfig.ENABLE_SELF_UPDATE);
        call.resolve(result);
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", BuildConfig.ENABLE_SELF_UPDATE);
        result.put("allowed", canRequestInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        if (!BuildConfig.ENABLE_SELF_UPDATE) {
            call.reject("In-app APK updates are disabled for this build flavor.");
            return;
        }
        String apkUrl = call.getString("url", "");
        String expectedSha256 = call.getString("sha256", "");
        if (!isAllowedInitialUrl(apkUrl)) {
            call.reject("Invalid update URL.");
            return;
        }
        if (!canRequestInstalls()) {
            openInstallPermissionSettings();
            JSObject result = new JSObject();
            result.put("status", "permission_required");
            call.resolve(result);
            return;
        }
        if (!downloading.compareAndSet(false, true)) {
            call.reject("Update download already in progress.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection connection = null;
            File updatesDir = new File(getContext().getCacheDir(), "updates");
            File partFile = new File(updatesDir, "hongo-study-update.apk.part");
            File apkFile = new File(updatesDir, "hongo-study-update.apk");
            try {
                if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                    throw new IllegalStateException("Cannot create update cache directory.");
                }
                connection = openWithRedirects(apkUrl);
                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    throw new IllegalStateException("HTTP " + status);
                }
                long totalBytes = connection.getContentLengthLong();
                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                try (
                    InputStream input = new BufferedInputStream(connection.getInputStream());
                    FileOutputStream output = new FileOutputStream(partFile)
                ) {
                    byte[] buffer = new byte[16384];
                    long downloaded = 0;
                    int lastPercent = -1;
                    long lastEmitMs = 0;
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        downloaded += read;
                        int percent = totalBytes > 0 ? (int) Math.min(100, (downloaded * 100L) / totalBytes) : -1;
                        long now = System.currentTimeMillis();
                        if ((percent >= 0 && percent - lastPercent >= 2) || now - lastEmitMs >= 150) {
                            lastPercent = percent;
                            lastEmitMs = now;
                            JSObject progress = new JSObject();
                            progress.put("progress", percent);
                            progress.put("downloadedBytes", downloaded);
                            progress.put("totalBytes", totalBytes);
                            notifyListeners("updateProgress", progress);
                        }
                    }
                }

                String actualSha256 = toHex(digest.digest());
                if (expectedSha256 != null && !expectedSha256.trim().isEmpty()) {
                    if (!actualSha256.equalsIgnoreCase(expectedSha256.trim())) {
                        //noinspection ResultOfMethodCallIgnored
                        partFile.delete();
                        throw new SecurityException("APK checksum verification failed.");
                    }
                }

                if (apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }
                if (!partFile.renameTo(apkFile)) {
                    throw new IllegalStateException("Failed to finalize downloaded APK.");
                }

                launchApkInstaller(apkFile);
                JSObject result = new JSObject();
                result.put("status", "installing");
                result.put("sha256", actualSha256);
                call.resolve(result);
            } catch (Exception error) {
                if (partFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    partFile.delete();
                }
                call.reject(error.getMessage() != null ? error.getMessage() : "Update failed.", error);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
                downloading.set(false);
            }
        });
    }

    private boolean canRequestInstalls() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private void launchApkInstaller(File apkFile) {
        Uri contentUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(installIntent);
    }

    private static HttpURLConnection openWithRedirects(String initialUrl) throws Exception {
        String currentUrl = initialUrl;
        for (int i = 0; i <= MAX_REDIRECTS; i++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(currentUrl).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setRequestProperty("Accept", "application/octet-stream");
            int code = conn.getResponseCode();
            if (code == HttpURLConnection.HTTP_MOVED_PERM
                || code == HttpURLConnection.HTTP_MOVED_TEMP
                || code == 307
                || code == 308) {
                String nextUrl = conn.getHeaderField("Location");
                conn.disconnect();
                if (!isAllowedRedirectUrl(nextUrl)) {
                    throw new SecurityException("Blocked untrusted redirect URL.");
                }
                currentUrl = nextUrl;
                continue;
            }
            return conn;
        }
        throw new IllegalStateException("Too many redirects.");
    }

    private static boolean isAllowedInitialUrl(String url) {
        return url != null
            && url.startsWith("https://github.com/Weinssy/Hongo-Study/releases/download/");
    }

    private static boolean isAllowedRedirectUrl(String url) {
        if (url == null) return false;
        try {
            URL parsed = new URL(url);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) return false;
            String host = parsed.getHost().toLowerCase(Locale.ROOT);
            return host.equals("github.com")
                || host.endsWith(".github.com")
                || host.endsWith(".githubusercontent.com");
        } catch (Exception ignored) {
            return false;
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02x", b));
        }
        return sb.toString();
    }
}
