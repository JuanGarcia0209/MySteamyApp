import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() deal: any;
  @Input() storeLogo: string = '';
  @Input() isFavorite: boolean = false;
  @Output() favoriteToggle = new EventEmitter<string>();
  @Output() cardClick = new EventEmitter<any>();

  onFavoriteClick(event: Event) {
    event.stopPropagation();
    this.favoriteToggle.emit(this.deal.gameID || this.deal.id);
  }

  onCardClick() {
    this.cardClick.emit(this.deal);
  }
}
