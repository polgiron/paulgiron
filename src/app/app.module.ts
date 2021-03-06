import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CubesComponent } from './components/cubes/cubes.component';
import { InfosService } from './services/infos.service';
import { SpaceComponent } from './components/space/space.component';
import { BubblesComponent } from './components/bubbles/bubbles.component';
import { Bubbles2Component } from './components/bubbles2/bubbles2.component';
import { CanvasComponent } from './components/space/canvas/canvas.component';
import { UfoComponent } from './components/space/ufo/ufo.component';

@NgModule({
  declarations: [
    AppComponent,
    CubesComponent,
    SpaceComponent,
    BubblesComponent,
    Bubbles2Component,
    CanvasComponent,
    UfoComponent
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
