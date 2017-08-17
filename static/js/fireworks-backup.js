var Particle;

PG.Fireworks = function() {
  this.canvas_ = $('#stars')[0];
  this.context_ = this.canvas_.getContext('2d');
  this.particleCount_ = 500;
  this.particles_ = [];
  this.probability_ = .04;

  this.play_();
};

PG.Fireworks.prototype.play_ = function() {
  this.updateCanvas_();
};

PG.Fireworks.prototype.updateCanvas_ = function() {
  this.update_();
  this.paint_();
  this.animationFrameLoop_ = window.requestAnimationFrame(this.updateCanvas_.bind(this));
};

PG.Fireworks.prototype.update_ = function() {
  var alive = [];

  if (this.particles_.length < this.particleCount_ && Math.random() < this.probability_) {
    this.createFirework_();
  }

  $.each(this.particles_, function(index, object) {
    if (this.moveParticle_(object)) {
      alive.push(object);
    }
  }.bind(this));

  this.particles_ = alive;
}

PG.Fireworks.prototype.paint_ = function() {
  this.context_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  $.each(this.particles_, function(index, object) {
    this.drawParticles_(object);
  }.bind(this));
}

PG.Fireworks.prototype.createFirework_ = function() {
  var xPoint = Math.random() * (this.canvas_.width - 200) + 100;
  var yPoint = Math.random() * (this.canvas_.height - 500) + 100;
  var nParticles = Math.floor(Math.random() * 50 + 100);

  while (nParticles--) {
    var particle = this.createParticle_(xPoint, yPoint);
    var velocityY =
        Math.sqrt(25 - particle.velocityX * particle.velocityX);
    if (Math.abs(particle.velocityY) > velocityY) {
      particle.velocityY = particle.velocityY > 0 ? velocityY : -velocityY;
    }
    this.particles_.push(particle);
  }
}

PG.Fireworks.prototype.createParticle_ = function(xPoint, yPoint) {
  var particleSize = Math.random() * 4 + 1;
  return {
    alpha: Math.random() * .5 + .5,
    gravity: .05,
    height: particleSize,
    velocityX: (Math.random() - .5) * 10,
    velocityY: (Math.random() - .5) * 10,
    width: particleSize,
    x: xPoint - particleSize / 2,
    y: yPoint - particleSize / 2
  };
}

PG.Fireworks.prototype.drawParticles_ = function(particle) {
  this.context_.save();
  this.context_.beginPath();
  this.context_.translate(
      particle.x + particle.width / 2, particle.y + particle.height / 2);

  this.context_.arc(0, 0, particle.width, 0, Math.PI * 2);
  this.context_.fillStyle = '#000';
  this.context_.globalAlpha = particle.alpha;
  this.context_.closePath();
  this.context_.fill();
  this.context_.restore();
}

PG.Fireworks.prototype.moveParticle_ = function(particle) {
  particle.x += particle.velocityX;
  particle.velocityY += particle.gravity;
  particle.y += particle.velocityY;
  particle.alpha -= .01;
  return !(
      particle.x <= -particle.width || particle.x >= this.canvas_.width ||
      particle.y >= this.canvas_.height || particle.alpha <= 0);
}
