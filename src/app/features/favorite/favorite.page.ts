import { Component } from '@angular/core';
import { GameProvider } from '../../shared/services/game.service';
import { Browser } from '@capacitor/browser';

@Component({
  standalone: false,
  selector: 'app-favorite',
  templateUrl: './favorite.page.html',
  styleUrls: ['./favorite.page.scss'],
})
export class FavoritePage {
  favoriteGame: any = null;
  favoriteDeals: any[] = [];
  isLoading: boolean = false;
  hasFavorite: boolean = false;

  constructor(private gameProvider: GameProvider) {}

  async ionViewWillEnter() {
    this.loadFavoriteGame();
  }

  async loadFavoriteGame() {
    this.isLoading = true;
    const favoriteId = await this.gameProvider.getFavoriteGame();

    if (favoriteId) {
      this.hasFavorite = true;
      this.gameProvider.getGameDetails(favoriteId).subscribe(details => {
        this.favoriteGame = details.info;
        this.favoriteDeals = details.deals;
        this.isLoading = false;
      });
    } else {
      this.hasFavorite = false;
      this.isLoading = false;
    }
  }

  async openDeal(dealID: string) {
    await Browser.open({ url: `https://www.cheapshark.com/redirect?dealID=${dealID}` });
  }
}
