// var SPEED = 80;
// var DURATION = 1.0 / SPEED;
// var DEGREES_TO_RADIANS = Math.PI / 180;

PG.ConfettiPaper = function(x, y) {
  // this.scene_ = $('#stars');
  this.position_ = [x, y];
  // this.rotationSpeed_ = Math.random() * 600 + 800;
  // this.angle_ = DEGREES_TO_RADIANS * Math.random() * 360;
  // this.rotation_ = DEGREES_TO_RADIANS * Math.random() * 360;
  // this.size_ = 4;
  // this.oscillationSpeed_ = Math.random() * 1.5 + .5;
  // this.xSpeed_ = 40;
  // this.ySpeed_ = (Math.random() * 60 + 50);
  // this.time_ = Math.random();
};

PG.ConfettiPaper.prototype.update = function() {
  // this.time_ += DURATION;
  // this.rotation_ += this.rotationSpeed_ * DURATION;
  // this.cosAngle_ = Math.cos(DEGREES_TO_RADIANS * this.rotation_);
  // this.position_.x +=
  //     Math.cos(this.time_ * this.oscillationSpeed_) *
  //     this.xSpeed_ * DURATION;
  // this.position_.y += this.ySpeed_ * DURATION;
  //
  // if (this.position_.y > this.scene_.offsetHeight) {
  //   this.position_.x = 0;
  //   this.position_.y = 0;
  // }
};

PG.ConfettiPaper.prototype.draw = function(context) {
  // Draw the dot

  // Path
  context.beginPath();
  var radius = 10;
  console.log(this.position_);
  context.arc(this.position_.x, this.position_.y, radius, 0, Math.PI * 2, false);
  context.closePath();

  // Color
  context.fillStyle = "#006699";
  context.fill();

  context.closePath();
  context.fill();
};
