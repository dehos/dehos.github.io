package id.kudakuda.editor2d;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
  private WebView webView; private long lastBack;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state); webView=new WebView(this); setContentView(webView);
    WebSettings s=webView.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(true);
    webView.setWebViewClient(new WebViewClient()); webView.addJavascriptInterface(new PrintBridge(),"AndroidPrint");
    if(state==null) webView.loadUrl("file:///android_asset/index.html"); else webView.restoreState(state);
  }
  @Override public void onBackPressed(){if(webView.canGoBack()){webView.goBack();return;}long n=System.currentTimeMillis();if(n-lastBack<2000){super.onBackPressed();return;}lastBack=n;Toast.makeText(this,"Tekan sekali lagi untuk keluar",Toast.LENGTH_SHORT).show();}
  @Override protected void onSaveInstanceState(Bundle out){webView.saveState(out);super.onSaveInstanceState(out);}
  private class PrintBridge {
    @JavascriptInterface public void printPdf(){runOnUiThread(()->{
      PrintManager manager=(PrintManager)getSystemService(Context.PRINT_SERVICE);
      PrintAttributes attrs=new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape()).setMinMargins(PrintAttributes.Margins.NO_MARGINS).build();
      manager.print("Rencana Aplikasi Meteran",webView.createPrintDocumentAdapter("Aplikasi-Meteran"),attrs);
    });}
  }
}
