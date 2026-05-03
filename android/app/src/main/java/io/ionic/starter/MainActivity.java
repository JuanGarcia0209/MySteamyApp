package io.ionic.starter;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
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
      Intent intent = new Intent(this, FavoriteWidget.class);
      intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);

      AppWidgetManager manager = AppWidgetManager.getInstance(this);
      ComponentName name = new ComponentName(this, FavoriteWidget.class);
      int[] ids = manager.getAppWidgetIds(name);

      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
      sendBroadcast(intent);
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
