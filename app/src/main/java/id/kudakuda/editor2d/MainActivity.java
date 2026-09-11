package id.kudakuda.editor2d;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
  private static final int CREATE_PROJECT=1201, OPEN_PROJECT=1202;
  private WebView webView; private long lastBack; private String pendingProject;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state); webView=new WebView(this); setContentView(webView);
    WebSettings s=webView.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(true);
    webView.setWebViewClient(new WebViewClient()); webView.addJavascriptInterface(new PrintBridge(),"AndroidPrint"); webView.addJavascriptInterface(new ProjectBridge(),"AndroidProject");
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
  private class ProjectBridge {
    @JavascriptInterface public void saveProject(String json,String filename){pendingProject=json;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,filename);startActivityForResult(i,CREATE_PROJECT);});}
    @JavascriptInterface public void openProject(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");startActivityForResult(i,OPEN_PROJECT);});}
  }
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(resultCode!=RESULT_OK||data==null||data.getData()==null)return;Uri uri=data.getData();try{if(requestCode==CREATE_PROJECT){try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new Exception("Penyimpanan tidak tersedia");out.write(pendingProject.getBytes(StandardCharsets.UTF_8));}pendingProject=null;Toast.makeText(this,"File proyek berhasil disimpan",Toast.LENGTH_SHORT).show();}else if(requestCode==OPEN_PROJECT){byte[] bytes;try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new Exception("File tidak dapat dibuka");byte[] buffer=new byte[8192];int read,total=0;while((read=in.read(buffer))!=-1){total+=read;if(total>10*1024*1024)throw new Exception("File proyek terlalu besar");out.write(buffer,0,read);}bytes=out.toByteArray();}String encoded=Base64.encodeToString(bytes,Base64.NO_WRAP);webView.evaluateJavascript("importProjectFromBase64('"+encoded+"')",null);}}catch(Exception e){Toast.makeText(this,"Gagal memproses file proyek",Toast.LENGTH_SHORT).show();}}
}
