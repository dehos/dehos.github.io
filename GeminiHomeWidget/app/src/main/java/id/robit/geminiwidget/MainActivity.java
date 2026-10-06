package id.robit.geminiwidget;

import android.app.Activity;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    public static final String DEFAULT_TEXT = "Tampilkan semua perangkat yang ada di google home";
    private EditText prompt;
    private Switch share;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding, padding, padding);
        scroll.addView(content);
        TextView title = new TextView(this);
        title.setText("Perintah Gemini"); title.setTextSize(26); content.addView(title);
        TextView explanation = new TextView(this);
        explanation.setText("Simpan perintah, lalu ketuk widget Perangkat rumah. Jika Gemini menerima teks melalui berbagi, teks akan diteruskan. Jika tidak, perintah disalin dan Gemini dibuka agar kamu bisa menempelkannya. Kamu tetap menekan Kirim.");
        explanation.setTextSize(16); content.addView(explanation);
        prompt = new EditText(this); prompt.setMinLines(3); prompt.setTextSize(18);
        prompt.setText(getSharedPreferences("command", MODE_PRIVATE).getString("text", DEFAULT_TEXT));
        content.addView(prompt);
        share = new Switch(this); share.setText("Coba kirim teks langsung ke Gemini");
        share.setChecked(getSharedPreferences("command", MODE_PRIVATE).getBoolean("share", true)); content.addView(share);
        TextView modeHelp = new TextView(this);
        modeHelp.setText("Matikan opsi ini jika Gemini terbuka tetapi teks tidak terisi. Widget akan memakai salin + buka Gemini."); content.addView(modeHelp);
        Button save = new Button(this); save.setText("Simpan perintah"); save.setOnClickListener(v -> save()); content.addView(save);
        Button test = new Button(this); test.setText("Coba buka Gemini");
        test.setOnClickListener(v -> { if (save()) startActivity(new Intent(this, CommandActivity.class)); }); content.addView(test);
        Button pin = new Button(this); pin.setText("Tambahkan widget");
        pin.setOnClickListener(v -> {
            if (!save()) return;
            AppWidgetManager manager = getSystemService(AppWidgetManager.class);
            if (manager.isRequestPinAppWidgetSupported()) manager.requestPinAppWidget(new ComponentName(this, CommandWidget.class), null, null);
            else Toast.makeText(this, "Tekan lama layar utama > Widget > Perintah Gemini.", Toast.LENGTH_LONG).show();
        }); content.addView(pin);
        TextView note = new TextView(this);
        note.setText("Hubungkan Google Home di aplikasi Gemini dengan akun Google yang sesuai. Widget ini tidak membaca daftar perangkat atau menjamin Gemini mendukung perintah tersebut. Tidak membutuhkan API key."); content.addView(note);
        setContentView(scroll);
    }
    private boolean save() {
        String text = prompt.getText().toString().trim();
        if (text.isEmpty()) { prompt.setError("Isi perintah terlebih dahulu"); return false; }
        getSharedPreferences("command", MODE_PRIVATE).edit().putString("text", text).putBoolean("share", share.isChecked()).apply();
        Toast.makeText(this, "Perintah tersimpan", Toast.LENGTH_SHORT).show();
        return true;
    }
}
