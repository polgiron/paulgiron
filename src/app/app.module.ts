import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CubesComponent } from './components/cubes/cubes.component';
import { InfosService } from './services/infos.service';

@NgModule({
  declarations: [
    AppComponent,
    CubesComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    InfosService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
