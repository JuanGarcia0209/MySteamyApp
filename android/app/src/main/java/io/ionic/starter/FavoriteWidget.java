package io.ionic.starter;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Paint;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class FavoriteWidget extends AppWidgetProvider {

  private static final String PREFS_NAME = "WidgetPrefs";
  private static final String PREF_KEY = "favoriteGame";
  private static final String PREF_INDEX = "current_promotion_index";
  private static final String ACTION_ROTATE_WIDGET = "io.ionic.starter.ACTION_ROTATE_WIDGET";
  private static final long ROTATION_INTERVAL_MS = 5000L;

  private static final Map<String, Bitmap> imageCache = new ConcurrentHashMap<>();

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    scheduleRotation(context);
    triggerUpdate(context, goAsync());
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    super.onReceive(context, intent);
    String action = intent.getAction();

    // Reanudar inmediatamente si el usuario desbloquea o hay una actualización del sistema
    if (Intent.ACTION_USER_PRESENT.equals(action) || AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
      scheduleRotation(context);
      triggerUpdate(context, goAsync());
      return;
    }

    if (ACTION_ROTATE_WIDGET.equals(action)) {
      // Reprogramar la cadena de iteración SIEMPRE
      scheduleRotation(context);

      PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
      boolean isInteractive = pm != null && pm.isInteractive();

      // Solo procesamos la actualización visual si la pantalla está encendida
      if (isInteractive) {
        incrementPromotionIndex(context);
        triggerUpdate(context, goAsync());
      }
    }
  }

  private static void triggerUpdate(Context context, PendingResult pendingResult) {
    new Thread(() -> {
      try {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetName = new ComponentName(context, FavoriteWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetName);

        for (int appWidgetId : appWidgetIds) {
          updateAppWidgetInternal(context, appWidgetManager, appWidgetId);
        }
      } catch (Exception e) {
        e.printStackTrace();
      } finally {
        if (pendingResult != null) pendingResult.finish();
      }
    }).start();
  }

  @Override
  public void onDisabled(Context context) {
    super.onDisabled(context);
    cancelRotation(context);
    imageCache.clear();
  }

  private static void updateAppWidgetInternal(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.favorite_widget);

    Intent intent = new Intent(context, MainActivity.class);
    PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
      String favoriteGameJson = prefs.getString(PREF_KEY, null);

      if (favoriteGameJson != null) {
        JSONObject game = new JSONObject(favoriteGameJson);
        JSONArray promotions = game.optJSONArray("promotions");
        int promotionCount = promotions != null ? promotions.length() : 0;

        // Usar índice secuencial guardado para una rotación suave
        int currentPromotionIndex = prefs.getInt(PREF_INDEX, 0);
        if (promotionCount > 0) {
          currentPromotionIndex = currentPromotionIndex % promotionCount;
        }

        views.setViewVisibility(R.id.widget_content_layout, View.VISIBLE);
        views.setViewVisibility(R.id.widget_empty_layout, View.GONE);

        String title = game.optString("title", "Unknown Game");
        String thumbUrl = game.optString("thumb", "");
        JSONObject promotion = promotions != null && promotionCount > 0 ? promotions.optJSONObject(currentPromotionIndex) : null;

        if (promotion == null) {
          promotion = createFallbackPromotion(game);
          promotionCount = 1;
        }

        JSONObject store = promotion.optJSONObject("store");
        String storeName = store != null ? store.optString("name", getStoreName(promotion.optString("storeID", "1"))) : getStoreName(promotion.optString("storeID", "1"));
        String storeImage = store != null ? store.optString("image", "") : "";
        String discountedPrice = promotion.optString("discountedPrice", promotion.optString("salePrice", "0.00"));
        String originalPrice = promotion.optString("originalPrice", promotion.optString("normalPrice", "0.00"));
        String normalPrice = promotion.optString("normalPrice", originalPrice);
        double savings = promotion.optDouble("discount", promotion.optDouble("savings", 0));

        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_sale_price, "$" + discountedPrice);
        views.setTextViewText(R.id.widget_normal_price, "$" + normalPrice);
        views.setTextViewText(R.id.widget_savings, "-" + Math.round(savings) + "%");
        views.setTextViewText(R.id.widget_store, storeName);
        views.setTextViewText(R.id.widget_promo_counter, promotionCount > 1 ? (currentPromotionIndex + 1) + " / " + promotionCount : "Oferta única");

        views.setInt(R.id.widget_normal_price, "setPaintFlags", Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG);

        Bitmap bBackground = getOrDownloadBitmap(context, thumbUrl);
        Bitmap bStore = getOrDownloadBitmap(context, storeImage);
        if (bBackground != null) views.setImageViewBitmap(R.id.widget_image, bBackground);
        if (bStore != null) views.setImageViewBitmap(R.id.widget_store_image, bStore);

      } else {
        views.setViewVisibility(R.id.widget_content_layout, View.GONE);
        views.setViewVisibility(R.id.widget_empty_layout, View.VISIBLE);
        cancelRotation(context);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }

    appWidgetManager.updateAppWidget(appWidgetId, views);
  }

  private static Bitmap getOrDownloadBitmap(Context context, String urlStr) {
    if (urlStr == null || urlStr.isEmpty()) return null;
    if (imageCache.containsKey(urlStr)) return imageCache.get(urlStr);

    String fileName = "fav_img_" + Math.abs(urlStr.hashCode());
    File file = new File(context.getCacheDir(), fileName);

    if (file.exists()) {
      Bitmap cached = BitmapFactory.decodeFile(file.getAbsolutePath());
      if (cached != null) {
        imageCache.put(urlStr, cached);
        return cached;
      }
    }

    try {
      HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
      conn.setConnectTimeout(3000);
      conn.setReadTimeout(3000);
      try (InputStream is = conn.getInputStream()) {
        Bitmap bitmap = BitmapFactory.decodeStream(is);
        if (bitmap != null) {
          try (FileOutputStream fos = new FileOutputStream(file)) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
          }
          if (imageCache.size() > 15) imageCache.clear();
          imageCache.put(urlStr, bitmap);
          return bitmap;
        }
      }
    } catch (Exception ignored) {}
    return null;
  }

  private static void incrementPromotionIndex(Context context) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    try {
      String json = prefs.getString(PREF_KEY, null);
      if (json != null) {
        JSONObject game = new JSONObject(json);
        JSONArray promos = game.optJSONArray("promotions");
        int count = promos != null ? promos.length() : 0;
        if (count > 1) {
          int current = prefs.getInt(PREF_INDEX, 0);
          prefs.edit().putInt(PREF_INDEX, (current + 1) % count).apply();
        }
      }
    } catch (Exception ignored) {}
  }

  private static void scheduleRotation(Context context) {
    if (!hasMultiplePromotions(context)) {
      cancelRotation(context);
      return;
    }

    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) return;

    PendingIntent pendingIntent = getRotationPendingIntent(context, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
    boolean isInteractive = pm != null && pm.isInteractive();

    try {
      if (isInteractive) {
        // Pantalla encendida: Usamos AlarmClock para precisión de 5s
        long triggerAtRTC = System.currentTimeMillis() + ROTATION_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
          // Fallback para Android 12+ si no tiene permiso de alarmas exactas
          alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtRTC, pendingIntent);
        } else {
          alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtRTC, pendingIntent), pendingIntent);
        }
      } else {
        // Pantalla apagada: Usamos setAndAllowWhileIdle para que el sistema lo agrupe y ahorre batería
        long triggerAtElapsed = SystemClock.elapsedRealtime() + ROTATION_INTERVAL_MS;
        alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtElapsed, pendingIntent);
      }
    } catch (SecurityException se) {
      // Fallback si falla por permisos en tiempo de ejecución (Android 12+)
      alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + ROTATION_INTERVAL_MS, pendingIntent);
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  private static void cancelRotation(Context context) {
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) return;
    PendingIntent pendingIntent = getRotationPendingIntent(context, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
    if (pendingIntent != null) {
      alarmManager.cancel(pendingIntent);
      pendingIntent.cancel();
    }
  }

  private static boolean hasMultiplePromotions(Context context) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
      String json = prefs.getString(PREF_KEY, null);
      if (json == null) return false;
      JSONObject game = new JSONObject(json);
      JSONArray promos = game.optJSONArray("promotions");
      return promos != null && promos.length() > 1;
    } catch (Exception e) { return false; }
  }

  private static PendingIntent getRotationPendingIntent(Context context, int flags) {
    Intent intent = new Intent(context, FavoriteWidget.class);
    intent.setAction(ACTION_ROTATE_WIDGET);
    return PendingIntent.getBroadcast(context, 1001, intent, flags);
  }

  private static JSONObject createFallbackPromotion(JSONObject game) throws org.json.JSONException {
    JSONObject p = new JSONObject();
    p.put("discountedPrice", game.optString("salePrice", "0.00"));
    p.put("originalPrice", game.optString("normalPrice", "0.00"));
    p.put("normalPrice", game.optString("normalPrice", "0.00"));
    p.put("discount", game.optDouble("savings", 0));
    p.put("storeID", game.optString("storeID", "1"));
    return p;
  }

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
