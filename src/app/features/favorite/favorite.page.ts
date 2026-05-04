import { Component } from '@angular/core';
import { GameProvider } from '../../shared/services/game.service';
import { Browser } from '@capacitor/browser';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-favorite',
  templateUrl: './favorite.page.html',
  styleUrls: ['./favorite.page.scss'],
})
export class FavoritePage {
  stores: any[] = [];
  favoriteGame: any = null;
  favoriteDeals: any[] = [];
  isLoading: boolean = false;
  hasFavorite: boolean = false;

  constructor(private gameProvider: GameProvider) {}

  async ionViewWillEnter() {
    this.loadStores();
    this.loadFavoriteGame();
  }

  loadStores() {
    this.gameProvider.getStores().subscribe(stores => {
      this.stores = stores;
    });
  }

  async loadFavoriteGame() {
    this.isLoading = true;
    const favoriteId = await this.gameProvider.getFavoriteGame();

    if (favoriteId) {
      this.hasFavorite = true;
      try {
        const baseDetails: any = await firstValueFrom(this.gameProvider.getGameDetails(favoriteId));
        const gameTitle = baseDetails?.info?.title || baseDetails?.info?.internalName || '';
        const enrichedDetails: any = gameTitle
          ? await firstValueFrom(this.gameProvider.getEnrichedGameDetails(gameTitle, favoriteId)).catch(() => null)
          : null;

        const details = enrichedDetails || baseDetails;
        const normalizedDeals = this.normalizeDeals(details?.deals || []);
        const sortedDeals = [...normalizedDeals].sort((firstDeal, secondDeal) => Number(firstDeal.salePrice) - Number(secondDeal.salePrice));
        const selectedDeal = normalizedDeals[0] || null;
        const bestDeal = sortedDeals[0] || null;

        this.favoriteGame = {
          ...details?.info,
          deals: sortedDeals,
          bestDeal,
          selectedDeal,
          isSelectedBest: !!selectedDeal && !!bestDeal && selectedDeal.salePrice === bestDeal.salePrice,
          dealRating: details?.info?.dealRating,
          metacriticScore: details?.info?.metacriticScore,
        };
        this.favoriteDeals = sortedDeals;
      } catch (error) {
        console.error('Error loading favorite game', error);
        this.favoriteGame = null;
        this.favoriteDeals = [];
      } finally {
        this.isLoading = false;
      }
    } else {
      this.hasFavorite = false;
      this.isLoading = false;
    }
  }

  private normalizeDeals(deals: any[]): any[] {
    return Array.isArray(deals)
      ? deals.map(deal => ({
          ...deal,
          salePrice: deal.salePrice ?? deal.price ?? '0.00',
          normalPrice: deal.normalPrice ?? deal.retailPrice ?? '0.00',
        }))
      : [];
  }

  getStoreLogo(storeID: string): string {
    const store = this.stores.find(s => s.storeID === storeID);
    if (store?.images?.icon) {
      return `https://www.cheapshark.com${store.images.icon}`;
    }
    return storeID ? `https://www.cheapshark.com/api/assets/store/${storeID}.png` : '';
  }

  getStoreName(storeID: string): string {
    const store = this.stores.find(s => s.storeID === storeID);
    return store?.storeName || 'Store desconocida';
  }

  formatPrice(value: string | number | null | undefined): string {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return '$0.00';
    }
    return `$${numericValue.toFixed(2)}`;
  }

  formatSavings(value: string | number | null | undefined): string {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return '0%';
    }
    return `${Math.round(numericValue)}%`;
  }

  formatDate(timestamp: number | string | null | undefined): string {
    if (!timestamp) {
      return 'Fecha no disponible';
    }

    const date = new Date(Number(timestamp) * 1000);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  async openDeal(dealID: string) {
    await Browser.open({ url: `https://www.cheapshark.com/redirect?dealID=${dealID}` });
  }
}
