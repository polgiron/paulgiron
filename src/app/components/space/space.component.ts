import { Component, OnInit } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';

@Component({
  selector: 'app-space',
  templateUrl: './space.component.html',
  styleUrls: ['./space.component.scss']
})
export class SpaceComponent implements OnInit {
  email: string;
  phone: string;

  constructor(
    private infos: InfosService
  ) { }

  ngOnInit() {
    this.email = this.infos.email;
    this.phone = this.infos.phone;
  }
}
