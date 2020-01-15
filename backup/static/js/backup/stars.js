// Requires requestAnimationFrame polyfill
// https://gist.github.com/1579671

// Constructor
PG.Stars = function() {
  console.log('Init stars constructor');

  this.animationFrameLoop_ = null;
  this.canvas_ = $('#stars')[0];
  this.context_ = this.canvas_.getContext('2d');
  this.canvasWidth_ = this.canvas_.width;
  this.canvasHeight_ = this.canvas_.height;
  this.angle_ = 0;

  this.play_();
};

PG.Stars.prototype.play_ = function() {
  this.update_();
};

PG.Stars.prototype.drawCircle_ = function() {
  this.context_.clearRect(0, 0, this.canvasWidth_, this.canvasHeight_);

  // color in the background
  this.context_.fillStyle = "#EEEEEE";
  this.context_.fillRect(0, 0, this.canvasWidth_, this.canvasHeight_);

  // draw the circle
  this.context_.beginPath();
  var radius = 25 + 150 * Math.abs(Math.cos(this.angle_));
  this.context_.arc(225, 225, radius, 0, Math.PI * 2, false);
  this.context_.closePath();

  // color in the circle
  this.context_.fillStyle = "#006699";
  this.context_.fill();

  this.angle_ += Math.PI / 64;
};

PG.Stars.prototype.update_ = function() {
  this.drawCircle_();
  this.animationFrameLoop_ = window.requestAnimationFrame(this.update_.bind(this));
};
