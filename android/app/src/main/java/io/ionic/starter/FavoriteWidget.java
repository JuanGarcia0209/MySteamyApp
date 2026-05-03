package io.ionic.starter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.net.URL;

public class FavoriteWidget extends AppWidgetProvider {

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId);
    }
  }

  static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.favorite_widget);

    // Configurar clic para abrir la app (en cualquier estado)
    Intent intent = new Intent(context, MainActivity.class);
    PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

    try {
      // Accedemos al almacenamiento de Capacitor
      SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
      String favoriteGameJson = prefs.getString("favoriteGame", null);

      if (favoriteGameJson != null) {
        JSONObject game = new JSONObject(favoriteGameJson);

        // Mostrar layout de contenido y ocultar el vacío
        views.setViewVisibility(R.id.widget_content_layout, View.VISIBLE);
        views.setViewVisibility(R.id.widget_empty_layout, View.GONE);

        // 1. Extraer datos del JSON
        String title = game.optString("title", "Unknown Game");
        String salePrice = game.optString("salePrice", "0.00");
        String normalPrice = game.optString("normalPrice", "0.00");
        double savings = game.optDouble("savings", 0);
        String thumbUrl = game.optString("thumb", "");
        String storeID = game.optString("storeID", "1");

        // 2. Asignar textos a la interfaz
        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_sale_price, "$" + salePrice);
        views.setTextViewText(R.id.widget_normal_price, "$" + normalPrice);
        views.setTextViewText(R.id.widget_savings, "-" + Math.round(savings) + "%");
        views.setTextViewText(R.id.widget_store, getStoreName(storeID));

        // 3. Tachar el precio normal (Efecto visual)
        views.setInt(R.id.widget_normal_price, "setPaintFlags",
          Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG);

        // 4. Cargar imagen de fondo en un hilo secundario (Async)
        new Thread(() -> {
          try {
            URL url = new URL(thumbUrl);
            Bitmap bmp = BitmapFactory.decodeStream(url.openConnection().getInputStream());
            views.setImageViewBitmap(R.id.widget_image, bmp);
            // Actualizar el widget de nuevo una vez cargada la imagen
            appWidgetManager.updateAppWidget(appWidgetId, views);
          } catch (Exception e) {
            e.printStackTrace();
          }
        }).start();

      } else {
        // Estado por defecto si no hay favorito (Mejorado con layout específico)
        views.setViewVisibility(R.id.widget_content_layout, View.GONE);
        views.setViewVisibility(R.id.widget_empty_layout, View.VISIBLE);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }

    appWidgetManager.updateAppWidget(appWidgetId, views);
  }

  // Traductor de IDs a nombres de tiendas reales
  private static String getStoreName(String id) {
    switch (id) {
      case "1": return "Steam";
      case "2": return "GamersGate";
      case "3": return "GreenManGaming";
      case "7": return "GOG";
      case "8": return "Origin";
      case "11": return "Humble Store";
      case "15": return "Fanatical";
      case "21": return "WinGameStore";
      case "25": return "Epic Games Store";
      case "31": return "Blizzard Shop";
      default: return "Digital Store";
    }
  }
}
