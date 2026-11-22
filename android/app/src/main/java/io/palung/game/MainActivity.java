package io.palung.game;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Pastikan window menggunakan adjustResize standar tanpa double-padding IME
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        // Set warna status bar & navigation bar senada dengan samudra dalam (#040d1a)
        getWindow().setStatusBarColor(Color.parseColor("#040d1a"));
        getWindow().setNavigationBarColor(Color.parseColor("#040d1a"));
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#040d1a"));

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        // Hanya beri padding untuk System Bars & Display Cutout (JANGAN tambahkan Type.ime()
        // karena adjustResize sudah menaikkan WebView tepat di atas keyboard tanpa celah abu-abu!)
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.parseColor("#040d1a"));
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets sysBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() |
                    WindowInsetsCompat.Type.displayCutout()
                );
                boolean imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
                int bottomPad = imeVisible ? 0 : sysBars.bottom;
                v.setPadding(sysBars.left, sysBars.top, sysBars.right, bottomPad);
                return windowInsets;
            });
        }
    }
}
