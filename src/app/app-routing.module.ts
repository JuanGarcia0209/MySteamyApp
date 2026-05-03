import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'deals',
    loadChildren: () => import('./features/deals/deals.module').then( m => m.DealsPageModule)
  },
  {
    path: 'favorite',
    loadChildren: () => import('./features/favorite/favorite.module').then( m => m.FavoritePageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
