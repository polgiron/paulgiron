PG.Particles = function() {
  this.canvas_ = $('#stars')[0];
  this.canvas_.width = window.innerWidth;
  this.canvas_.height = window.innerHeight;
  this.context_ = this.canvas_.getContext('2d');
  this.particleCount_ = 50;
  this.particles_ = [];
  this.probability_ = .5;
  this.particleColor_ = '#858585';

  this.play_();
};

PG.Particles.prototype.play_ = function() {
  this.updateCanvas_();
};

PG.Particles.prototype.updateCanvas_ = function() {
  this.update_();
  this.paint_();
  this.animationFrameLoop_ = window.requestAnimationFrame(this.updateCanvas_.bind(this));
};

PG.Particles.prototype.update_ = function() {
  // Add one particle more if needed
  if (this.particles_.length < this.particleCount_ && Math.random() < this.probability_) {
    var particle = this.createParticle_();
    this.particles_.push(particle);
  }

  // Check how many particles are still alive
  var alive = [];
  $.each(this.particles_, function(index, object) {
    if (this.updateParticle_(object)) {
      alive.push(object);
    }
  }.bind(this));
  this.particles_ = alive;
}

PG.Particles.prototype.paint_ = function() {
  this.context_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  $.each(this.particles_, function(index, particle) {
    this.drawParticle_(particle);
  }.bind(this));
}

PG.Particles.prototype.createParticle_ = function() {
  // var xPoint = Math.random() * (this.canvas_.width - 200) + 100;
  // var yPoint = Math.random() * (this.canvas_.height - 200) + 100;
  var xPoint = Math.random() * (this.canvas_.width) + 100;
  var yPoint = Math.random() * (this.canvas_.height) + 100;
  var particleSize = Math.random() * 1 + 1;

  return {
    alpha: Math.random() * .5 + .5,
    height: particleSize,
    width: particleSize,
    x: xPoint - particleSize / 2,
    y: yPoint - particleSize / 2
  };
}

PG.Particles.prototype.drawParticle_ = function(particle) {
  this.context_.save();
  this.context_.beginPath();
  this.context_.translate(
      particle.x + particle.width / 2, particle.y + particle.height / 2);
  this.context_.arc(0, 0, particle.width, 0, Math.PI * 2);
  this.context_.fillStyle = this.particleColor_;
  this.context_.globalAlpha = particle.alpha;
  this.context_.closePath();
  this.context_.fill();
  this.context_.restore();
}

PG.Particles.prototype.updateParticle_ = function(particle) {
  particle.alpha -= .01;
  return !(particle.alpha <= 0);
}
