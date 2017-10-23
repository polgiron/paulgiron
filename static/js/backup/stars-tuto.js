// Requires requestAnimationFrame polyfill
// https://gist.github.com/1579671

window.APP = window.APP || {};

APP.init = function() {
  APP.setup.initObjects();
  APP.setup.initSpeedInput();
  APP.setup.addListeners();
  APP.play();
};

APP.pause = function() {
  window.cancelAnimationFrame(APP.animationFrameLoop);
  APP.isRunning = false;
};

APP.play = function() {
  if (!APP.isRunning) {
    APP._then = Date.now();
    APP.core.frame();
    APP.isRunning = true;
  }
};

APP.core = {
  frame: function() {
    APP.now = Date.now();
    APP._delta = (APP.now - APP._then) / 1000; // Converts to seconds (optional)
    APP._then = APP.now;
    APP.core.update();
    APP.animationFrameLoop = window.requestAnimationFrame(APP.core.frame);
  },

  update: function() {
    APP.workers.moveObjects();

    // Update css position
    var wholePixelBulletX = (APP.bullet.x + 0.5) | 0; // Fast round to whole pixel
    APP.bullet.element.style.left = wholePixelBulletX + 'px';

    // Render Framerate every 1/4 second
    if (APP.framerateDisplay.timer > 0.25) {
      APP.framerateDisplay.innerHTML = (1 / APP._delta) | 0; // fast round to whole number
      APP.framerateDisplay.timer = 0;
    } else {
      APP.framerateDisplay.timer += APP._delta;
    }
  }
};

APP.setup = {
  addListeners: function() {
    // Makes demo responsive for small screens
    window.addEventListener('resize', APP.workers.calculateBulletStart);
  },

  initSpeedInput: function() {
    APP.speedInput = document.getElementById('speed-input');
    APP.speedInput.value = APP.bullet.speed;
    APP.speedInput.addEventListener('keyup', APP.workers.updateSpeed);
    APP.speedInput.addEventListener('change', APP.workers.updateSpeed);
  },

  initObjects: function() {
    APP.bullet = {
      element: document.getElementById('css-bullet'),
      x: 460,
      y: 114,
      height: 56,
      width: 64,
      startX: 460,
      speed: 100 // pixels per second
    };

    APP.cannon = {
      element: document.getElementById('css-cannon'),
      x: 460,
      y: 110,
      height: 128,
      width: 64
    };

    // Update start X based on screen size
    APP.workers.calculateBulletStart();
    APP.bullet.x = APP.bullet.startX;

    APP.framerateDisplay = document.getElementById('framerate');
    APP.framerateDisplay.timer = 0;
  }
};

APP.workers = {
  moveObjects: function() {
    // Move bullet's x position
    var velocity = APP.bullet.speed * APP._delta;
    APP.bullet.x = APP.bullet.x - velocity;

    // Reset when off screen
    if (APP.bullet.x < -APP.bullet.width) {
      APP.bullet.x = APP.bullet.startX;
    }
  },

  calculateBulletStart: function() {
    APP.bullet.startX = APP.cannon.element.offsetLeft;
  },

  updateSpeed: function(e) {
    APP.bullet.speed = APP.speedInput.value;
  }
};

APP.init();
