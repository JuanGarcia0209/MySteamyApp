import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
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

interface StoreInfo {
  storeID: string;
  storeName: string;
  images?: {
    icon?: string;
  };
}

interface WidgetPromotion {
  dealID: string;
  storeID: string;
  store: {
    name: string;
    image: string;
  };
  originalPrice: string;
  discount: string;
  discountedPrice: string;
  normalPrice: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameProvider {
  private baseUrl = 'https://www.cheapshark.com/api/1.0';
  private FAVORITE_KEY = 'favorite_game_id';
  private storesCache: StoreInfo[] = [];
  private storesPromise: Promise<StoreInfo[]> | null = null;

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

  private async getStoresSnapshot(): Promise<StoreInfo[]> {
    if (this.storesCache.length > 0) {
      return this.storesCache;
    }

    if (!this.storesPromise) {
      this.storesPromise = firstValueFrom(this.getStores()).then((stores: StoreInfo[]) => {
        this.storesCache = Array.isArray(stores) ? stores : [];
        return this.storesCache;
      }).catch(error => {
        this.storesPromise = null;
        throw error;
      });
    }

    return this.storesPromise;
  }

  private getStoreFallbackName(storeID: string): string {
    switch (storeID) {
      case '1': return 'Steam';
      case '2': return 'GamersGate';
      case '3': return 'GreenManGaming';
      case '7': return 'GOG';
      case '8': return 'Origin';
      case '11': return 'Humble Store';
      case '15': return 'Fanatical';
      case '21': return 'WinGameStore';
      case '25': return 'Epic Games Store';
      case '31': return 'Blizzard Shop';
      default: return 'Digital Store';
    }
  }

  private getStoreFallbackImage(storeID: string): string {
    return `https://www.cheapshark.com/api/assets/store/${storeID}.png`;
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

  // Método para obtener detalles enriquecidos del juego con dealRating y metacriticScore
  getEnrichedGameDetails(gameTitle: string, gameID: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/deals?title=${encodeURIComponent(gameTitle)}&pageSize=10`).pipe(
      map((dealsResponse: any) => {
        // Filtrar por gameID para obtener todas las ofertas de este juego específico
        const gameDeals = Array.isArray(dealsResponse)
          ? dealsResponse.filter((deal: any) => deal.gameID === gameID)
          : [];

        if (gameDeals.length === 0) {
          return null;
        }

        // Usar el primer resultado como referencia para info del juego
        const firstDeal = gameDeals[0];
        const sortedDeals = [...gameDeals].sort((a, b) => Number(a.salePrice) - Number(b.salePrice));

        return {
          info: {
            internalName: firstDeal.internalName,
            title: firstDeal.title,
            thumb: firstDeal.thumb,
            steamAppID: firstDeal.steamAppID,
            dealRating: firstDeal.dealRating,
            metacriticScore: firstDeal.metacriticScore,
            steamRatingPercent: firstDeal.steamRatingPercent,
            steamRatingText: firstDeal.steamRatingText,
            releaseDate: firstDeal.releaseDate
          },
          deals: sortedDeals,
          cheapestPriceEver: null // CheapShark API no proporciona esto en deals endpoint
        };
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
      const stores = await this.getStoresSnapshot().catch(() => []);
      const info = details.info;
      const deals = Array.isArray(details.deals) ? [...details.deals] : [];
      const sortedDeals = deals.sort((firstDeal, secondDeal) => Number(firstDeal.price) - Number(secondDeal.price));

      const promotions: WidgetPromotion[] = sortedDeals.map((deal: any) => {
        const store = stores.find(storeItem => storeItem.storeID === deal.storeID);
        const storeName = store?.storeName || this.getStoreFallbackName(deal.storeID);
        const storeImage = store?.images?.icon
          ? `https://www.cheapshark.com${store.images.icon}`
          : this.getStoreFallbackImage(deal.storeID);

        return {
          dealID: deal.dealID,
          storeID: deal.storeID,
          store: {
            name: storeName,
            image: storeImage,
          },
          originalPrice: deal.retailPrice || '0.00',
          discount: deal.savings || '0',
          discountedPrice: deal.price || '0.00',
          normalPrice: deal.retailPrice || '0.00'
        };
      });

      const bestDeal = promotions.length > 0 ? promotions[0] : null;

      const favoriteGame = {
        title: info.title,
        thumb: info.thumb,
        promotions,
        salePrice: bestDeal ? bestDeal.discountedPrice : '0.00',
        normalPrice: bestDeal ? bestDeal.normalPrice : '0.00',
        savings: bestDeal ? parseFloat(bestDeal.discount) : 0,
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
