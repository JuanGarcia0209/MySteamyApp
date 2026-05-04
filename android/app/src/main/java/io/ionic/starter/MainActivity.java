package io.ionic.starter;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onResume() {
    super.onResume();
    // Cambiado a public para que no choque con BridgeActivity
    updateMyWidget();
  }

  @Override
  public void onPause() {
    super.onPause();
    // Cambiado a public para que no choque con BridgeActivity
    updateMyWidget();
  }

  private void updateMyWidget() {
    try {
      // 1. Sincronizar datos de Capacitor al Widget (Puente)
      SharedPreferences capPrefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
      String data = capPrefs.getString("favoriteGame", null);
      if (data == null) {
        data = getSharedPreferences("_cap_CapacitorStorage", MODE_PRIVATE).getString("favoriteGame", null);
      }

      // Guardamos en un archivo exclusivo para el Widget y reiniciamos el índice de rotación
      getSharedPreferences("WidgetPrefs", MODE_PRIVATE).edit()
        .putString("favoriteGame", data)
        .putInt("current_promotion_index", 0)
        .commit();

      // 2. Notificar al Widget para que se redibuje
      AppWidgetManager manager = AppWidgetManager.getInstance(this);
      ComponentName name = new ComponentName(this, FavoriteWidget.class);
      int[] ids = manager.getAppWidgetIds(name);

      if (ids != null && ids.length > 0) {
        Intent intent = new Intent(this, FavoriteWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        sendBroadcast(intent);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
