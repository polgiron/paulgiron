import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CubesComponent } from './components/cubes/cubes.component';


const routes: Routes = [
  { path: '', redirectTo: 'cubes', pathMatch: 'full' },
  {
    path: 'cubes',
    component: CubesComponent
  },
  // {
  //   path: 'space',
  //   component: HomeComponent
  // },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
