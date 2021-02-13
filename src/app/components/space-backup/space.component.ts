import { Component, OnInit } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';
import { getRandomInt } from 'src/app/utils/utils';

@Component({
  selector: 'app-space',
  templateUrl: './space.component.html',
  styleUrls: ['./space.component.scss']
})
export class SpaceComponent implements OnInit {
  email: string;
  phone: string;
  stars: Star[] = [];
  numberOfStars: number = 30;

  constructor(
    private infos: InfosService
  ) { }

  ngOnInit(): void {
    this.email = this.infos.email;
    this.phone = this.infos.phone;
    for (let index = 0; index < this.numberOfStars; index++) {
      this.stars.push({
        left: getRandomInt(0, window.innerWidth / 1.5) + 'px',
        top: getRandomInt(0, window.innerHeight - 80) + 'px',
        size: getRandomInt(10, 14) + 'px',
        delay: getRandomInt(1000, 5000) + 'ms'
      })
    }
  }

  // numberOfStars(n: number): any[] {
  //   return Array(n);
  // }

  // get randomProperties(): Star {
  //   return {
  //     left: getRandomInt(0, window.innerWidth / 1.5) + 'px',
  //     top: getRandomInt(0, window.innerHeight - 80) + 'px',
  //     size: getRandomInt(10, 14) + 'px',
  //     delay: getRandomInt(1000, 5000) + 'ms'
  //   }
  // }
}

interface Star {
  left: string;
  top: string;
  size: string;
  delay: string;
}
