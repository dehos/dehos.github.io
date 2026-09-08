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

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://dehos.github.io/";
    private static final String APP_HOST = "dehos.github.io";
    private static final int FILE_PICKER_REQUEST = 41;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileCallback;

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
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidDownloads");
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class DownloadBridge {
        @JavascriptInterface
        public void save(String filename, String mimeType, String dataUrl) {
            runOnUiThread(() -> {
                try {
                    int comma = dataUrl.indexOf(',');
                    if (comma < 0) throw new IllegalArgumentException("Invalid data URL");
                    byte[] bytes = Base64.decode(
                        dataUrl.substring(comma + 1).getBytes(StandardCharsets.UTF_8),
                        Base64.DEFAULT
                    );

                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/Stock Barang");

                    Uri outputUri = getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI, values
                    );
                    if (outputUri == null) throw new IllegalStateException("Cannot create download");
                    try (OutputStream stream = getContentResolver().openOutputStream(outputUri)) {
                        if (stream == null) throw new IllegalStateException("Cannot open download");
                        stream.write(bytes);
                    }
                    Toast.makeText(MainActivity.this, R.string.download_saved, Toast.LENGTH_LONG).show();
                } catch (Exception error) {
                    Toast.makeText(MainActivity.this, R.string.download_failed, Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void failed() {
            runOnUiThread(() -> Toast.makeText(
                MainActivity.this, R.string.download_failed, Toast.LENGTH_LONG
            ).show());
        }
    }
}
