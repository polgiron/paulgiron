import { Component, OnInit } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';

@Component({
  selector: 'app-cubes',
  templateUrl: './cubes.component.html',
  styleUrls: ['./cubes.component.scss']
})
export class CubesComponent implements OnInit {
  email: string;
  phone: string;

  constructor(
    private infos: InfosService
  ) {
    this.email = this.infos.email;
    this.phone = this.infos.phone;
  }

  ngOnInit() { }
}
