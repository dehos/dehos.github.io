package io.github.dehos.stockbarang;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://dehos.github.io/";
    private static final String APP_HOST = "dehos.github.io";
    private static final int FILE_PICKER_REQUEST = 41;
    private static final long EXIT_CONFIRMATION_WINDOW_MS = 2000L;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileCallback;
    private long lastBackPressedAt = 0L;
    private final Map<String, DownloadSession> downloadSessions = new ConcurrentHashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        configureWebView();

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }

    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " StockBarangAndroid/1.0");

        webView.setBackgroundColor(Color.rgb(5, 8, 22));
        webView.addJavascriptInterface(new DownloadBridge(), "AndroidDownloads");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                openExternal(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                if (pendingFileCallback != null) {
                    pendingFileCallback.onReceiveValue(null);
                }
                pendingFileCallback = filePathCallback;
                try {
                    startActivityForResult(fileChooserParams.createIntent(), FILE_PICKER_REQUEST);
                } catch (ActivityNotFoundException error) {
                    pendingFileCallback = null;
                    Toast.makeText(MainActivity.this, R.string.file_picker_unavailable, Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.startsWith("blob:")) {
                downloadBlob(url, mimeType, contentDisposition);
            } else if (url != null) {
                openExternal(Uri.parse(url));
            }
        });
    }

    private void downloadBlob(String blobUrl, String mimeType, String contentDisposition) {
        String safeMime = mimeType == null || mimeType.trim().isEmpty()
            ? "application/octet-stream"
            : mimeType;
        String filename = filenameFromDisposition(contentDisposition, safeMime);

        String script = "(async()=>{" +
            "const r=await fetch(" + quoteForJavaScript(blobUrl) + ");" +
            "const b=await r.blob();const x=new FileReader();" +
            "x.onloadend=()=>AndroidDownloads.save(" + quoteForJavaScript(filename) + "," +
            quoteForJavaScript(safeMime) + ",x.result);x.readAsDataURL(b);" +
            "})().catch(()=>AndroidDownloads.failed())";
        webView.evaluateJavascript(script, null);
    }

    private String filenameFromDisposition(String disposition, String mimeType) {
        if (disposition != null) {
            int marker = disposition.toLowerCase().indexOf("filename=");
            if (marker >= 0) {
                String name = disposition.substring(marker + 9).replace("\"", "").trim();
                if (!name.trim().isEmpty()) return name.replaceAll("[^a-zA-Z0-9._ -]", "_");
            }
        }
        String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
        return "Stock-Barang-" + System.currentTimeMillis() + (extension == null ? "" : "." + extension);
    }

    private String quoteForJavaScript(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_PICKER_REQUEST || pendingFileCallback == null) return;
        Uri[] files = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        pendingFileCallback.onReceiveValue(files);
        pendingFileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastBackPressedAt <= EXIT_CONFIRMATION_WINDOW_MS) {
            super.onBackPressed();
            return;
        }

        lastBackPressedAt = now;
        Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        for (String id : downloadSessions.keySet()) {
            cleanupDownloadSession(id);
        }
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidDownloads");
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class DownloadBridge {
        @JavascriptInterface
        public String begin(String filename, String mimeType) {
            String id = UUID.randomUUID().toString();
            try {
                File temporaryFile = File.createTempFile("stock-export-", ".part", getCacheDir());
                DownloadSession session = new DownloadSession(
                    sanitizeFilename(filename),
                    sanitizeMimeType(mimeType),
                    temporaryFile,
                    new FileOutputStream(temporaryFile)
                );
                downloadSessions.put(id, session);
                return id;
            } catch (Exception error) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean append(String id, String base64Chunk) {
            DownloadSession session = downloadSessions.get(id);
            if (session == null) return false;

            try {
                byte[] bytes = Base64.decode(base64Chunk, Base64.NO_WRAP);
                session.stream.write(bytes);
                return true;
            } catch (Exception error) {
                cleanupDownloadSession(id);
                return false;
            }
        }

        @JavascriptInterface
        public boolean finish(String id) {
            DownloadSession session = downloadSessions.remove(id);
            if (session == null) {
                showDownloadResult(false);
                return false;
            }

            boolean success = false;
            try {
                session.stream.close();
                success = saveFileToDownloads(
                    session.filename,
                    session.mimeType,
                    session.temporaryFile
                );
            } catch (Exception ignored) {
                success = false;
            } finally {
                session.temporaryFile.delete();
            }

            showDownloadResult(success);
            return success;
        }

        @JavascriptInterface
        public void cancel(String id) {
            cleanupDownloadSession(id);
        }

        @JavascriptInterface
        public void save(String filename, String mimeType, String dataUrl) {
            boolean success = false;
            try {
                int comma = dataUrl.indexOf(',');
                if (comma < 0) throw new IllegalArgumentException("Invalid data URL");
                byte[] bytes = Base64.decode(
                    dataUrl.substring(comma + 1).getBytes(StandardCharsets.UTF_8),
                    Base64.DEFAULT
                );
                success = saveBytesToDownloads(
                    sanitizeFilename(filename),
                    sanitizeMimeType(mimeType),
                    bytes
                );
            } catch (Exception ignored) {
                success = false;
            }
            showDownloadResult(success);
        }

        @JavascriptInterface
        public void failed() {
            showDownloadResult(false);
        }
    }

    private String sanitizeFilename(String filename) {
        String safeName = filename == null ? "Stock-Barang" : filename.trim();
        safeName = safeName.replaceAll("[\\\\/:*?\"<>|]", "-");
        return safeName.isEmpty() ? "Stock-Barang" : safeName;
    }

    private String sanitizeMimeType(String mimeType) {
        return mimeType == null || mimeType.trim().isEmpty()
            ? "application/octet-stream"
            : mimeType;
    }

    private boolean saveBytesToDownloads(String filename, String mimeType, byte[] bytes) {
        Uri outputUri = createDownloadUri(filename, mimeType);
        if (outputUri == null) return false;

        try (OutputStream stream = getContentResolver().openOutputStream(outputUri)) {
            if (stream == null) throw new IllegalStateException("Cannot open download");
            stream.write(bytes);
        } catch (Exception error) {
            getContentResolver().delete(outputUri, null, null);
            return false;
        }

        try {
            publishDownload(outputUri);
            return true;
        } catch (Exception error) {
            getContentResolver().delete(outputUri, null, null);
            return false;
        }
    }

    private boolean saveFileToDownloads(String filename, String mimeType, File source) {
        Uri outputUri = createDownloadUri(filename, mimeType);
        if (outputUri == null) return false;

        try (
            FileInputStream input = new FileInputStream(source);
            OutputStream output = getContentResolver().openOutputStream(outputUri)
        ) {
            if (output == null) throw new IllegalStateException("Cannot open download");
            byte[] buffer = new byte[32 * 1024];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
        } catch (Exception error) {
            getContentResolver().delete(outputUri, null, null);
            return false;
        }

        try {
            publishDownload(outputUri);
            return true;
        } catch (Exception error) {
            getContentResolver().delete(outputUri, null, null);
            return false;
        }
    }

    private Uri createDownloadUri(String filename, String mimeType) {
        android.content.ContentValues values = new android.content.ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/Stock Barang");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        return getContentResolver().insert(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            values
        );
    }

    private void publishDownload(Uri outputUri) {
        android.content.ContentValues values = new android.content.ContentValues();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContentResolver().update(outputUri, values, null, null);
    }

    private void cleanupDownloadSession(String id) {
        DownloadSession session = downloadSessions.remove(id);
        if (session == null) return;
        try {
            session.stream.close();
        } catch (Exception ignored) {
        }
        session.temporaryFile.delete();
    }

    private void showDownloadResult(boolean success) {
        runOnUiThread(() -> Toast.makeText(
            MainActivity.this,
            success ? R.string.download_saved : R.string.download_failed,
            Toast.LENGTH_LONG
        ).show());
    }

    private static final class DownloadSession {
        final String filename;
        final String mimeType;
        final File temporaryFile;
        final OutputStream stream;

        DownloadSession(
            String filename,
            String mimeType,
            File temporaryFile,
            OutputStream stream
        ) {
            this.filename = filename;
            this.mimeType = mimeType;
            this.temporaryFile = temporaryFile;
            this.stream = stream;
        }
    }
}
