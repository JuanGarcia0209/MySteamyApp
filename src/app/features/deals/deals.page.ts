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

  openGameModal(deal: any) {
    const id = deal.gameID || deal.id;
    this.gameProvider.getGameDetails(id).subscribe(details => {
      this.selectedGame = { ...details.info, dealId: deal.dealID, deals: details.deals };
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
