import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CubesComponent } from './components/cubes/cubes.component';
import { SpaceComponent } from './components/space/space.component';
import { BubblesComponent } from './components/bubbles/bubbles.component';
import { Bubbles2Component } from './components/bubbles2/bubbles2.component';

const routes: Routes = [
  { path: '', redirectTo: 'space', pathMatch: 'full' },
  {
    path: 'cubes',
    component: CubesComponent
  },
  {
    path: 'space',
    component: SpaceComponent
  },
  {
    path: 'bubbles',
    component: BubblesComponent
  },
  {
    path: 'bubbles2',
    component: Bubbles2Component
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
