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
      await AppWidget.updateWidget({
        title: 'No hay favorito seleccionado',
        salePrice: '',
        retailPrice: '',
        discount: '',
        storeName: '',
        thumb: ''
      });
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

  // Método privado para enviar los datos a Java
  private async updateNativeWidget(details: any) {
    try {
      const info = details.info;
      const bestDeal = details.deals && details.deals.length > 0 ? details.deals[0] : null;

      const title = info.title;
      const thumb = info.thumb;
      const salePrice = bestDeal ? `$${bestDeal.price}` : 'N/A';
      const retailPrice = bestDeal ? `$${bestDeal.retailPrice}` : '';
      const discount = bestDeal && parseFloat(bestDeal.savings) > 0
        ? `-${Math.round(parseFloat(bestDeal.savings))}%`
        : '';

      // Mapeo simple de tiendas comunes (puedes ampliarlo o usar getStores)
      const stores: { [key: string]: string } = {
        "1": "Steam",
        "2": "GamersGate",
        "3": "GreenManGaming",
        "7": "GOG",
        "11": "Humble Store",
        "25": "Epic Games Store"
      };
      const storeName = bestDeal ? (stores[bestDeal.storeID] || `Store ${bestDeal.storeID}`) : '';

      await AppWidget.updateWidget({
        title,
        salePrice,
        retailPrice,
        discount,
        storeName,
        thumb
      });
    } catch (e) {
      console.warn('Native widget update not available or failed', e);
    }
  }
}
