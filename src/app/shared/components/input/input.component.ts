import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent {
  @Input() placeholderText: string = 'Buscar ofertas...';
  @Output() searchChange = new EventEmitter<string>();

  onSearch(event: any) {
    this.searchChange.emit(event.detail.value);
  }
}
