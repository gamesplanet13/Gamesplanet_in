package in.gamesplanet.safareshahadat;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.PermissionRequest;

public final class MainActivity extends Activity {
  private static final String HOME = "https://gamesplanet13.github.io/Gamesplanet_in/poh-samagam/";
  private static final String SANGAT = "https://gamesplanet13.github.io/gurbanisearch/sangat.html";
  private WebView web;
  private TextView homeTab, sangatTab;
  private boolean inSangat = false;
  private Updater updater;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(15,45,54));
    getWindow().setNavigationBarColor(Color.rgb(14,39,47));

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(Color.rgb(249,246,238));
    LinearLayout top = new LinearLayout(this);
    top.setPadding(dp(12),dp(10),dp(12),dp(10));
    top.setBackgroundColor(Color.rgb(17,52,61));
    TextView title = new TextView(this);
    title.setText("ੴ  Safar-e-Shahadat 2026");
    title.setTextColor(Color.WHITE);
    title.setTextSize(20);
    title.setTypeface(null,1);
    top.addView(title,new LinearLayout.LayoutParams(0,-2,1));
    TextView updateButton = new TextView(this);
    updateButton.setText("↻ Update");
    updateButton.setTextColor(Color.rgb(244,214,162));
    updateButton.setTextSize(14);
    updateButton.setPadding(dp(12),dp(8),dp(4),dp(8));
    top.addView(updateButton);
    updater = new Updater(this);
    updateButton.setOnClickListener(v -> updater.check(true));
    root.addView(top);

    web = new WebView(this);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setLoadsImagesAutomatically(true);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setSupportMultipleWindows(false);
    CookieManager.getInstance().setAcceptCookie(true);
    CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest req) { req.deny(); }
    });
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        return navigate(req.getUrl());
      }
      @Override public void onPageFinished(WebView v,String url) {
        if (url.startsWith(SANGAT)) inSangat=true;
        else if(url.startsWith(HOME)) inSangat=false;
        updateTabs();
      }
    });
    root.addView(web,new LinearLayout.LayoutParams(-1,0,1));

    LinearLayout bottom=new LinearLayout(this);
    bottom.setPadding(dp(7),dp(7),dp(7),dp(7));
    bottom.setBackgroundColor(Color.rgb(15,48,58));
    homeTab=tab("📅  Samagam");
    sangatTab=tab("ੴ  Sangat View");
    bottom.addView(homeTab,new LinearLayout.LayoutParams(0,dp(49),1));
    bottom.addView(sangatTab,new LinearLayout.LayoutParams(0,dp(49),1));
    root.addView(bottom,new LinearLayout.LayoutParams(-1,-2));
    setContentView(root);
    homeTab.setOnClickListener(v->showPage(false));
    sangatTab.setOnClickListener(v->showPage(true));
    showPage(false);
  }

  @Override protected void onResume(){super.onResume();if(updater!=null)updater.resume();}
  @Override protected void onPause(){if(updater!=null)updater.pause();super.onPause();}

  private TextView tab(String label){
    TextView t=new TextView(this);
    t.setText(label);
    t.setGravity(android.view.Gravity.CENTER);
    t.setTextSize(15);
    t.setTypeface(null,1);
    t.setTextColor(Color.WHITE);
    return t;
  }
  private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
  private void updateTabs(){
    homeTab.setBackgroundColor(inSangat?Color.TRANSPARENT:Color.rgb(177,131,67));
    sangatTab.setBackgroundColor(inSangat?Color.rgb(177,131,67):Color.TRANSPARENT);
  }
  private void showPage(boolean sangat) {
    if(inSangat==sangat && web.getUrl()!=null) return;
    inSangat=sangat;
    updateTabs();
    web.loadUrl(sangat?SANGAT:HOME);
  }
  private boolean navigate(Uri uri){
    if(uri==null)return true;
    String url=uri.toString();
    if(url.startsWith(SANGAT)){showPage(true);return true;}
    if(url.startsWith(HOME)){inSangat=false;updateTabs();return false;}
    if("https".equals(uri.getScheme()) && "gamesplanet13.github.io".equals(uri.getHost())) return false;
    try {
      Intent intent=new Intent(Intent.ACTION_VIEW,uri);
      startActivity(intent);
    }catch(Exception ignored){}
    return true;
  }
  @Override public void onBackPressed(){
    if(inSangat){showPage(false);return;}
    if(web.canGoBack()){web.goBack();return;}
    super.onBackPressed();
  }
  @Override protected void onDestroy(){ if(updater!=null)updater.close();if(web!=null){((ViewGroup)web.getParent()).removeView(web);web.destroy();}super.onDestroy(); }
}
