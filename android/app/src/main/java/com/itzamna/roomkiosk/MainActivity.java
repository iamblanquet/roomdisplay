package com.itzamna.roomkiosk;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Actividad Principal en Modo Kiosco para Tablets Android.
 * - Mantiene la pantalla siempre encendida.
 * - Bloquea la barra de navegación y estado (Inmersión total).
 * - Carga la interfaz web del Room Display Kiosk.
 */
public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "RoomKioskPrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "http://192.168.1.100:3000/?room=SaladeJuntasCamp@itzamna.mx";

    private WebView webView;
    private ProgressBar progressBar;
    private FrameLayout errorLayout;
    private TextView errorTextView;
    private SharedPreferences prefs;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Mantener pantalla siempre encendida
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Pantalla completa sin título
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorLayout = findViewById(R.id.errorLayout);
        errorTextView = findViewById(R.id.errorTextView);

        setupFullscreen();
        setupWebView();

        // Botón de reintento ante desconexión
        findViewById(R.id.btnRetry).setOnClickListener(v -> loadKioskUrl());

        // Botón de configuración de URL (oculto / accesible por admin)
        findViewById(R.id.btnSettings).setOnClickListener(v -> showUrlConfigDialog());

        loadKioskUrl();
    }

    @Override
    protected void onResume() {
        super.onResume();
        setupFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupFullscreen();
        }
    }

    /**
     * Modo Inmersivo Sticky (Oculta barra de navegación y barra de estado)
     */
    private void setupFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setBackgroundColor(Color.parseColor("#020617"));

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    showError("No se pudo conectar con el servidor Kiosk. Verifique la red o la dirección IP.");
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hideError();
            }
        });
    }

    private void loadKioskUrl() {
        String url = prefs.getString(KEY_SERVER_URL, DEFAULT_URL);
        hideError();
        progressBar.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    private void showError(String message) {
        errorLayout.setVisibility(View.VISIBLE);
        errorTextView.setText(message);
        webView.setVisibility(View.GONE);
    }

    private void hideError() {
        errorLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void showUrlConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configurar URL del Kiosk");

        final EditText input = new EditText(this);
        input.setText(prefs.getString(KEY_SERVER_URL, DEFAULT_URL));
        builder.setView(input);

        builder.setPositiveButton("Guardar", (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                prefs.edit().putString(KEY_SERVER_URL, newUrl).apply();
                loadKioskUrl();
            }
        });

        builder.setNegativeButton("Cancelar", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    @Override
    public void onBackPressed() {
        // Bloquear tecla atrás en modo kiosco
    }
}
