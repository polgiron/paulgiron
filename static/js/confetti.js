var RETINA = 2;
var PARTICLE_COUNT = 25;

PG.Confetti = function() {
  this.canvas_ = $('#stars')[0];
  this.canvas_.width = 500;
  this.canvas_.height = 500;
  this.context_ = this.canvas_.getContext('2d');
  this.particles_ = [];

  this.play_();
};

PG.Confetti.prototype.play_ = function() {
  this.update_();
};

PG.Confetti.prototype.update_ = function() {
  console.log(this.particles_.length);
  console.log(PARTICLE_COUNT);
  debugger;
  if (this.particles_.length < PARTICLE_COUNT) {
    this.createConfetti_();
  }

  this.paint_();

  this.animationFrameLoop_ = window.requestAnimationFrame(this.update_.bind(this));
};

PG.Confetti.prototype.paint_ = function() {
  this.context_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  $.each(this.particles_, function(index, object) {
    object.update();
    object.draw(this.context_);
  }.bind(this));
};

PG.Confetti.prototype.createConfetti_ = function() {
  while (PARTICLE_COUNT--) {
    var particle = new PG.ConfettiPaper(
        Math.random() * this.canvas_.width,
        Math.random() * this.canvas_.height);
    this.particles_.push(particle);
  }
};
