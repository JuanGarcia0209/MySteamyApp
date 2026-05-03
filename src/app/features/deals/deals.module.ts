import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DealsPageRoutingModule } from './deals-routing.module';
import { DealsPage } from './deals.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DealsPageRoutingModule,
    SharedModule
  ],
  declarations: [DealsPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DealsPageModule {}
