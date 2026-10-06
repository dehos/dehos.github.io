package id.robit.geminiwidget;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

public class CommandActivity extends Activity {
    static final String GEMINI = "com.google.android.apps.bard";
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (saved != null) { finish(); return; }
        String text = getSharedPreferences("command", MODE_PRIVATE)
                .getString("text", MainActivity.DEFAULT_TEXT);
        boolean share = getSharedPreferences("command", MODE_PRIVATE).getBoolean("share", true);
        if (share) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.setPackage(GEMINI);
            send.putExtra(Intent.EXTRA_TEXT, text);
            try {
                if (send.resolveActivity(getPackageManager()) != null) {
                    startActivity(send);
                    finish();
                    return;
                }
            } catch (ActivityNotFoundException | SecurityException ignored) { }
        }
        ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("Perintah Gemini", text));
        Intent launch = getPackageManager().getLaunchIntentForPackage(GEMINI);
        if (launch != null) {
            try {
                Toast.makeText(this, "Perintah disalin. Tempel di Gemini, lalu tekan Kirim.", Toast.LENGTH_LONG).show();
                startActivity(launch);
                finish();
                return;
            } catch (ActivityNotFoundException | SecurityException ignored) { }
        }
        new AlertDialog.Builder(this).setTitle("Aplikasi Gemini belum tersedia")
            .setMessage("Perintah sudah disalin. Instal aplikasi Gemini atau buka Gemini web dan tempel perintah. Integrasi Google Home perlu aplikasi Gemini yang mendukungnya.")
            .setPositiveButton("Play Store", (d, w) -> open("https://play.google.com/store/apps/details?id=" + GEMINI))
            .setNeutralButton("Gemini web", (d, w) -> open("https://gemini.google.com/"))
            .setNegativeButton("Tutup", (d, w) -> finish())
            .setOnCancelListener(d -> finish()).show();
    }
    private void open(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "Tidak ada aplikasi untuk membuka tautan.", Toast.LENGTH_LONG).show(); }
        finish();
    }
}
