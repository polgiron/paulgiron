PG.Cubes = function() {
  // Scene and camera
  this.scene_ = new THREE.Scene();
  this.camera_ = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Renderer
  this.renderer_ = new THREE.WebGLRenderer({antialias: true, alpha: true});
  this.renderer_.setSize(window.innerWidth, window.innerHeight);
  this.renderer_.setClearColor(0xffffff, 0);
  document.body.appendChild(this.renderer_.domElement);

  // Camera position
  this.camera_.position.x = 0;
  this.camera_.position.y = 8;
  this.camera_.position.z = 12;

  // Controls
  this.controls_ = new THREE.OrbitControls(this.camera_);
  this.controls_.enabled = false;

  // Ambient light
  var ambient = new THREE.AmbientLight(0x404040, 2.5);
  this.scene_.add(ambient);

  // Spotlight
  this.spotLight_ = new THREE.SpotLight(0x404040, 2.5);
  this.spotLight_.position.set(-10, 15, 0);
  this.scene_.add(this.spotLight_);

  // Helpers
  // this.addHelpers_();

  // Cubes colors
  this.colors_ = {
    blue: new THREE.Color('rgb(0, 112, 223)'),
    white: new THREE.Color('rgb(255, 255, 255)'),
    orange: new THREE.Color('rgb(255, 81, 34)')
  };

  this.cubeWrapper_ = new THREE.Object3D();
  this.cubes_ = [];
  this.delay_ = 30;
  this.speed_ = 1500

  // Links to hover
  // this.links_ = document.querySelectorAll('.email, .phone');

  this.addCubes_();
  this.addPivot_();
  this.addListeners_();
  this.start_();
};

PG.Cubes.prototype.addListeners_ = function() {
  window.addEventListener('resize', this.onWindowResize_.bind(this), false);
  // document.addEventListener('mousemove', this.onMouseMove_.bind(this), false);

  // this.links_.forEach(function(element) {
  //   element.addEventListener('mouseenter', this.onMouseHover_.bind(this), false);
  // }.bind(this));
};

PG.Cubes.prototype.onWindowResize_ = function() {
  this.camera_.aspect = window.innerWidth / window.innerHeight;
  this.camera_.updateProjectionMatrix();
  this.renderer_.setSize(window.innerWidth, window.innerHeight);
};

// PG.Cubes.prototype.onMouseHover_ = function(event) {
  // console.log(event.target);
// };

PG.Cubes.prototype.onMouseMove_ = function(event) {
  var x = event.clientX;
  // var y = event.clientY;
  var length = window.innerWidth / 2;
  var toY = 4;
  // var delta = 3;

  if (x < window.innerWidth / 2) {
    for (var i = 0; i < this.cubes_.length; i++) {
      // var toY = -(this.cubes_[i].defaultY - delta);
      var cubeY = -(toY - ((toY + this.cubes_[i].defaultY) * x / length));
      this.cubes_[i].position.y = cubeY;
    }
  }
};

PG.Cubes.prototype.addHelpers_ = function() {
  var axes = new THREE.AxesHelper(20);
  var helper = new THREE.GridHelper(100, 10);
  this.scene_.add(axes);
  this.scene_.add(helper);

  var lightHelper = new THREE.SpotLightHelper(this.spotLight_);
  this.scene_.add(lightHelper);
};

PG.Cubes.prototype.addCube_ = function(args) {
  var material = new THREE.MeshPhongMaterial({color: args.color, dithering: true});
  var geometry = new THREE.BoxBufferGeometry(args.size1, 20, args.size3);
  var cube = new THREE.Mesh(geometry, material);
  // cube.position.set(args.x, args.y, args.z);
  cube.position.set(args.x, -22, args.z);
  this.cubeWrapper_.add(cube);
  cube.defaultY = args.y;
  cube.delay = args.delay;
  this.cubes_.push(cube);
};

PG.Cubes.prototype.addPivot_ = function() {
  this.pivot_ = new THREE.Group();
  this.scene_.add(this.pivot_);
  this.pivot_.add(this.cubeWrapper_);
  this.cubeWrapper_.position.set(-7, -6, 2);
  this.pivot_.rotation.x = .2;
  this.pivot_.rotation.y = .6;
  this.pivot_.rotation.z = -.65;
};

PG.Cubes.prototype.animateCube_ = function(element, toY, speed, delay) {
  var tween = new TWEEN.Tween(element.position).to({y: toY}, speed);
  tween.delay(delay);
  tween.easing(TWEEN.Easing.Quintic.Out);
  // tween.repeat(Infinity);
  tween.yoyo(true);
  tween.start();
};

PG.Cubes.prototype.start_ = function() {
  // Start loop
  this.loop_();

  // Animate cubes
  for (var i = 0; i < this.cubes_.length; i++) {
    this.animateCube_(this.cubes_[i], this.cubes_[i].defaultY, this.speed_, this.cubes_[i].delay);
  }
};

PG.Cubes.prototype.loop_ = function() {
  window.requestAnimationFrame(this.loop_.bind(this));
  TWEEN.update();
  this.renderer_.render(this.scene_, this.camera_);
};

PG.Cubes.prototype.addCubes_ = function() {
  this.addCube_({
    x: 0,
    y: 0,
    z: 0,
    size1: 2,
    size2: 10,
    size3: 2,
    color: this.colors_.blue,
    delay: 0
  });

  this.addCube_({
    x: -1.5,
    y: -1,
    z: -.5,
    size1: 1,
    size2: 10,
    size3: 1,
    color: this.colors_.white,
    delay: this.delay_
  });

  this.addCube_({
    x: -1.5,
    y: -1.8,
    z: 1,
    size1: 1,
    size2: 10,
    size3: 2,
    color: this.colors_.orange,
    delay: this.delay_ * 2
  });

  this.addCube_({
    x: -.5,
    y: -1.4,
    z: 1.5,
    size1: 1,
    size2: 10,
    size3: 1,
    color: this.colors_.white,
    delay: this.delay_ * 3
  });

  this.addCube_({
    x: .5,
    y: -.8,
    z: 1.5,
    size1: 1,
    size2: 10,
    size3: 1,
    color: this.colors_.orange,
    delay: this.delay_ * 4
  });

  this.addCube_({
    x: 0,
    y: -3,
    z: 3,
    size1: 2,
    size2: 10,
    size3: 2,
    color: this.colors_.blue,
    delay: this.delay_ * 5
  });

  this.addCube_({
    x: -2,
    y: -4,
    z: 3,
    size1: 2,
    size2: 10,
    size3: 2,
    color: this.colors_.white,
    delay: this.delay_ * 6
  });

  this.addCube_({
    x: -2.5,
    y: -3,
    z: .5,
    size1: 1,
    size2: 10,
    size3: 3,
    color: this.colors_.blue,
    delay: this.delay_ * 7
  });

  this.addCube_({
    x: -2.5,
    y: -2.3,
    z: -1.5,
    size1: 2.5,
    size2: 10,
    size3: 1,
    color: this.colors_.orange,
    delay: this.delay_ * 4
  });

  this.addCube_({
    x: -3.5,
    y: -4,
    z: -.5,
    size1: 1,
    size2: 10,
    size3: 1,
    color: this.colors_.white,
    delay: this.delay_ * 8
  });

  this.addCube_({
    x: 1.5,
    y: -1.5,
    z: 1.5,
    size1: 1,
    size2: 10,
    size3: 3,
    color: this.colors_.white,
    delay: this.delay_ * 4
  });

  this.addCube_({
    x: 1.5,
    y: -2.5,
    z: 4,
    size1: 1,
    size2: 10,
    size3: 2,
    color: this.colors_.orange,
    delay: this.delay_ * 6
  });

  this.addCube_({
    x: 2.25,
    y: -1.2,
    z: 1.5,
    size1: .5,
    size2: 10,
    size3: 2,
    color: this.colors_.blue,
    delay: this.delay_ * 6
  });

  this.addCube_({
    x: -.5,
    y: -.5,
    z: -1.25,
    size1: 2,
    size2: 10,
    size3: .5,
    color: this.colors_.orange,
    delay: this.delay_ * 7
  });
};
