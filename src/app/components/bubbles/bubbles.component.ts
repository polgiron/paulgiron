import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';
import { Bubble } from 'src/app/models/bubble.model';

@Component({
  selector: 'app-bubbles',
  templateUrl: './bubbles.component.html',
  styleUrls: ['./bubbles.component.scss']
})
export class BubblesComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  email: string = this.infos.email;
  phone: string = this.infos.phone;
  ctx: CanvasRenderingContext2D;
  animationFrameId: any;
  mobs: Bubble[] = [];
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
  playing: boolean = false;
  tick: number = 0;
  colors: string[] = [
    '#1abc9c',
    '#2ecc71',
    '#3498db',
    '#9b59b6',
    '#16a085',
    '#27ae60',
    '#2980b9',
    '#8e44ad',
    '#f1c40f',
    '#e67e22',
    '#e74c3c',
    '#f39c12',
    '#d35400',
    '#c0392b',

    // '#eccc68',
    // '#ff7f50',
    // '#ff6b81',
    // '#ffa502',
    // '#ff6348',
    // '#ff4757',
    // '#7bed9f',
    // '#70a1ff',
    // '#5352ed',
    // '#2ed573',
    // '#1e90ff',
    // '#3742fa',
    // '#fad390',
    // '#f8c291',
    // '#6a89cc',
    // '#82ccdd',
    // '#b8e994',
    // '#f6b93b',
    // '#e55039',
    // '#4a69bd',
    // '#60a3bc',
    // '#78e08f',
    // '#fa983a',
    // '#eb2f06',
    // '#1e3799',
    // '#3c6382',
    // '#38ada9',
    // '#e58e26',
    // '#b71540',
    // '#0c2461',
    // '#0a3d62',
    // '#079992',
    // '#fc5c65',
    // '#fd9644',
    // '#fed330',
    // '#26de81',
    // '#2bcbba',
    // '#2bcbba',
    // '#fa8231',
    // '#f7b731',
    // '#20bf6b',
    // '#0fb9b1',
    // '#45aaf2',
    // '#4b7bec',
    // '#a55eea',
    // '#2d98da',
    // '#3867d6',
    // '#8854d0'
  ];

  constructor(
    private infos: InfosService
  ) { }

  ngOnInit(): void {
    this.initCanvas();
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  initCanvas(): void {
    const devicePixelRatio: number = window.devicePixelRatio || 1;
    this.canvas.nativeElement.width = this.canvasWidth * devicePixelRatio;
    this.canvas.nativeElement.height = this.canvasHeight * devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.globalAlpha = .7;
    // this.ctx.globalAlpha = .02;
  }

  start(): void {
    this.colors.forEach(color => {
      this.mobs.push(new Bubble(this.ctx, color));
    });
    this.resume();
  }

  pause(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.playing = false;
  }

  resume(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.playing = true;
  }

  stop(): void {
    this.pause();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  animate(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.tick++;
    this.mobs.forEach(mob => {
      mob.moveRandom();
    });

    // if (this.ctx.globalAlpha < 0.6) {
    //   this.ctx.globalAlpha += .01;
    // }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    // if (this.tick == 500) {
    //   this.pause();
    // }
  }

  onClickPlay(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.resume();
    }
  }

  // getEase(currentProgress: number, start: number, distance: number, steps: number): number {
  //   currentProgress /= steps / 2;
  //   if (currentProgress < 1) {
  //     return (distance / 2) * (Math.pow(currentProgress, 3)) + start;
  //   }
  //   currentProgress -= 2;
  //   return distance / 2 * (Math.pow(currentProgress, 3) + 2) + start;
  // }
}
