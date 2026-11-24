package io.github.weinssy.hongostudy;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(JapaneseTtsPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            boolean isDark = nightMode == Configuration.UI_MODE_NIGHT_YES;
            webView.setBackgroundColor(isDark ? 0xFF121316 : 0xFFFAF8F5);

            WebSettings settings = webView.getSettings();
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setLoadWithOverviewMode(false);
            settings.setUseWideViewPort(true);
        }
    }
}
