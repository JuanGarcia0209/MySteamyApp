import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { registerPlugin } from '@capacitor/core';
import { map } from 'rxjs/operators';

// Registramos el puente nativo que creamos en Java
export interface AppWidgetPlugin {
  updateWidget(options: {
    title: string;
    salePrice: string;
    retailPrice: string;
    discount: string;
    storeName: string;
    thumb: string;
  }): Promise<void>;
}
const AppWidget = registerPlugin<AppWidgetPlugin>('AppWidget');

@Injectable({
  providedIn: 'root'
})
export class GameProvider {
  private baseUrl = 'https://www.cheapshark.com/api/1.0';
  private FAVORITE_KEY = 'favorite_game_id';

  constructor(private http: HttpClient) {
    this.checkAndRefreshWidget();
  }

  async checkAndRefreshWidget() {
    const favoriteId = await this.getFavoriteGame();
    if (favoriteId) {
      this.getGameDetails(favoriteId).subscribe();
    } else {
      this.clearWidget();
    }
  }

  async clearWidget() {
    try {
      await Preferences.remove({ key: 'favoriteGame' });
    } catch (e) {
      console.warn('Could not clear widget', e);
    }
  }

  getStores(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stores`);
  }

  getTopDeals(): Observable<any> {
    return this.http.get(`${this.baseUrl}/deals?storeID=1&upperPrice=15&pageSize=10`);
  }

  searchDeals(title: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/deals?title=${title}`);
  }

  getGameDetails(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/games?id=${id}`).pipe(
      map((details: any) => {
        // Si este es el juego favorito actual, actualizamos el widget
        this.getFavoriteGame().then(favoriteId => {
          if (favoriteId === id) {
            this.updateNativeWidget(details);
          }
        });
        return details;
      })
    );
  }

  async saveFavoriteGame(gameId: string) {
    await Preferences.set({ key: this.FAVORITE_KEY, value: gameId });
    // Al guardar un nuevo favorito, pedimos sus detalles para actualizar el widget
    if (gameId) {
      this.getGameDetails(gameId).subscribe();
    } else {
      this.clearWidget();
    }
  }

  async getFavoriteGame(): Promise<string | null> {
    const { value } = await Preferences.get({ key: this.FAVORITE_KEY });
    return value;
  }

  // Método privado para enviar los datos a Java vía SharedPreferences (CapacitorStorage)
  private async updateNativeWidget(details: any) {
    try {
      const info = details.info;
      const bestDeal = details.deals && details.deals.length > 0 ? details.deals[0] : null;

      const favoriteGame = {
        title: info.title,
        thumb: info.thumb,
        salePrice: bestDeal ? bestDeal.price : '0.00',
        normalPrice: bestDeal ? bestDeal.retailPrice : '0.00',
        savings: bestDeal ? parseFloat(bestDeal.savings) : 0,
        storeID: bestDeal ? bestDeal.storeID : '1'
      };

      // Guardamos el objeto completo para que el widget de Java lo lea
      await Preferences.set({
        key: 'favoriteGame',
        value: JSON.stringify(favoriteGame)
      });
    } catch (e) {
      console.warn('Error saving to Preferences for widget', e);
    }
  }
}
