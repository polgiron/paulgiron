import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';

@Component({
  selector: 'app-cubes',
  templateUrl: './cubes.component.html',
  styleUrls: ['./cubes.component.scss']
})
export class CubesComponent implements OnInit {
  @ViewChild('wrapper', { static: true }) wrapper: ElementRef;
  email: string;
  phone: string;
  scene: any;
  camera: any;
  renderer: any;
  controls: any;
  spotLight: any;
  colors: any;
  cubeWrapper: any;
  cubes: any = [];
  delay: number = 30;
  speed: number = 1500;
  pivot: any;

  constructor(
    private infos: InfosService
  ) { }

  ngOnInit() {
    this.email = this.infos.email;
    this.phone = this.infos.phone;

    // THREE
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 1000);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0xffffff, 0);
    this.wrapper.nativeElement.appendChild(this.renderer.domElement);

    // Camera position
    this.camera.position.x = 0;
    this.camera.position.y = 8;
    this.camera.position.z = 12;

    // Controls
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.enabled = false;

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 2.5);
    this.scene.add(ambient);

    // Spotlight
    this.spotLight = new THREE.SpotLight(0x404040, 2.5);
    this.spotLight.position.set(-10, 15, 0);
    this.scene.add(this.spotLight);

    // Cubes colors
    this.colors = {
      blue: new THREE.Color('rgb(0, 112, 223)'),
      white: new THREE.Color('rgb(255, 255, 255)'),
      orange: new THREE.Color('rgb(255, 81, 34)')
    };

    this.cubeWrapper = new THREE.Object3D();

    // this.addHelpers();
    this.addCubes();
    this.addPivot();
    this.start();
  }

  addCube(args: any) {
    const material = new THREE.MeshPhongMaterial({ color: args.color, dithering: true });
    const geometry = new THREE.BoxBufferGeometry(args.size1, 20, args.size3);
    const cube = new THREE.Mesh(geometry, material);
    // cube.position.set(args.x, args.y, args.z);
    cube.position.set(args.x, -22, args.z);
    this.cubeWrapper.add(cube);
    cube.defaultY = args.y;
    cube.delay = args.delay;
    this.cubes.push(cube);
  }

  addCubes() {
    this.addCube({
      x: 0,
      y: 0,
      z: 0,
      size1: 2,
      size2: 10,
      size3: 2,
      color: this.colors.blue,
      delay: 0
    });

    this.addCube({
      x: -1.5,
      y: -1,
      z: -.5,
      size1: 1,
      size2: 10,
      size3: 1,
      color: this.colors.white,
      delay: this.delay
    });

    this.addCube({
      x: -1.5,
      y: -1.8,
      z: 1,
      size1: 1,
      size2: 10,
      size3: 2,
      color: this.colors.orange,
      delay: this.delay * 2
    });

    this.addCube({
      x: -.5,
      y: -1.4,
      z: 1.5,
      size1: 1,
      size2: 10,
      size3: 1,
      color: this.colors.white,
      delay: this.delay * 3
    });

    this.addCube({
      x: .5,
      y: -.8,
      z: 1.5,
      size1: 1,
      size2: 10,
      size3: 1,
      color: this.colors.orange,
      delay: this.delay * 4
    });

    this.addCube({
      x: 0,
      y: -3,
      z: 3,
      size1: 2,
      size2: 10,
      size3: 2,
      color: this.colors.blue,
      delay: this.delay * 5
    });

    this.addCube({
      x: -2,
      y: -4,
      z: 3,
      size1: 2,
      size2: 10,
      size3: 2,
      color: this.colors.white,
      delay: this.delay * 6
    });

    this.addCube({
      x: -2.5,
      y: -3,
      z: .5,
      size1: 1,
      size2: 10,
      size3: 3,
      color: this.colors.blue,
      delay: this.delay * 7
    });

    this.addCube({
      x: -2.5,
      y: -2.3,
      z: -1.5,
      size1: 2.5,
      size2: 10,
      size3: 1,
      color: this.colors.orange,
      delay: this.delay * 4
    });

    this.addCube({
      x: -3.5,
      y: -4,
      z: -.5,
      size1: 1,
      size2: 10,
      size3: 1,
      color: this.colors.white,
      delay: this.delay * 8
    });

    this.addCube({
      x: 1.5,
      y: -1.5,
      z: 1.5,
      size1: 1,
      size2: 10,
      size3: 3,
      color: this.colors.white,
      delay: this.delay * 4
    });

    this.addCube({
      x: 1.5,
      y: -2.5,
      z: 4,
      size1: 1,
      size2: 10,
      size3: 2,
      color: this.colors.orange,
      delay: this.delay * 6
    });

    this.addCube({
      x: 2.25,
      y: -1.2,
      z: 1.5,
      size1: .5,
      size2: 10,
      size3: 2,
      color: this.colors.blue,
      delay: this.delay * 6
    });

    this.addCube({
      x: -.5,
      y: -.5,
      z: -1.25,
      size1: 2,
      size2: 10,
      size3: .5,
      color: this.colors.orange,
      delay: this.delay * 7
    });
  }

  addPivot() {
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.pivot.add(this.cubeWrapper);
    this.cubeWrapper.position.set(-7, -6, 2);
    this.pivot.rotation.x = .2;
    this.pivot.rotation.y = .6;
    this.pivot.rotation.z = -.65;
  }

  start() {
    // Start loop
    this.loop();

    // Animate cubes
    for (var i = 0; i < this.cubes.length; i++) {
      this.animateCube(this.cubes[i], this.cubes[i].defaultY, this.speed, this.cubes[i].delay);
    }
  }

  loop() {
    window.requestAnimationFrame(this.loop.bind(this));
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }

  animateCube(element: any, toY: number, speed: number, delay: number) {
    var tween = new TWEEN.Tween(element.position).to({ y: toY }, speed);
    tween.delay(delay);
    tween.easing(TWEEN.Easing.Quintic.Out);
    // tween.repeat(Infinity);
    tween.yoyo(true);
    tween.start();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addHelpers() {
    const axes = new THREE.AxesHelper(20);
    const helper = new THREE.GridHelper(100, 10);
    this.scene.add(axes);
    this.scene.add(helper);
    const lightHelper = new THREE.SpotLightHelper(this.spotLight);
    this.scene.add(lightHelper);
  }
}
