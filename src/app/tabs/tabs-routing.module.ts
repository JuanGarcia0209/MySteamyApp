import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'deals',
        loadChildren: () => import('../features/deals/deals.module').then(m => m.DealsPageModule)
      },
      {
        path: 'favorite',
        loadChildren: () => import('../features/favorite/favorite.module').then(m => m.FavoritePageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/deals',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/deals',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {}
