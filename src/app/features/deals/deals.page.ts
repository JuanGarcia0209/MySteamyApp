import { Component, OnInit } from '@angular/core';
import { GameProvider } from '../../shared/services/game.service';
import { Browser } from '@capacitor/browser';

@Component({
  standalone: false,
  selector: 'app-deals',
  templateUrl: './deals.page.html',
  styleUrls: ['./deals.page.scss'],
})
export class DealsPage implements OnInit {
  topDeals: any[] = [];
  searchResults: any[] = [];
  stores: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  favoriteId: string | null = null;
  isModalOpen: boolean = false;
  selectedGame: any = null;

  constructor(private gameProvider: GameProvider) {}

  ngOnInit() {
    this.loadStores();
    this.loadTopDeals();
  }

  ionViewWillEnter() {
    this.loadFavorite();
  }

  loadStores() {
    this.gameProvider.getStores().subscribe(stores => {
      this.stores = stores;
    });
  }

  loadTopDeals() {
    this.isLoading = true;
    this.gameProvider.getTopDeals().subscribe(deals => {
      this.topDeals = deals;
      this.isLoading = false;
    });
  }

  async loadFavorite() {
    this.favoriteId = await this.gameProvider.getFavoriteGame();
  }

  handleSearch(query: string) {
    this.searchQuery = query;
    if (query.trim() === '') {
      this.searchResults = [];
      return;
    }
    this.isLoading = true;
    this.gameProvider.searchDeals(query).subscribe(results => {
      this.searchResults = results;
      this.isLoading = false;
    });
  }

  async toggleFavorite(gameId: string) {
    this.favoriteId = gameId;
    await this.gameProvider.saveFavoriteGame(gameId);
  }

  getStoreLogo(storeID: string): string {
    const store = this.stores.find(s => s.storeID === storeID);
    return store ? `https://www.cheapshark.com${store.images.icon}` : '';
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

  openGameModal(deal: any) {
    const id = deal.gameID || deal.id;
    this.gameProvider.getGameDetails(id).subscribe(details => {
      const deals = [...(details.deals || [])].sort((firstDeal, secondDeal) => Number(firstDeal.price) - Number(secondDeal.price));

      this.selectedGame = {
        ...details.info,
        steamAppID: details.info?.steamAppID || id,
        dealId: deal.dealID,
        deals,
        bestDeal: deals[0] || null,
        cheapestPriceEver: details.cheapestPriceEver || null,
      };
      this.isModalOpen = true;
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedGame = null;
  }

  async openDeal(dealID: string) {
    await Browser.open({ url: `https://www.cheapshark.com/redirect?dealID=${dealID}` });
  }
}
