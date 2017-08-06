// Constructor
Photol.Main = function() {
  this.init_();
};

// Init function
Photol.Main.prototype.init_ = function() {
  console.log('Init main constructor');

  var $scene = $('.parallax-wrapper').parallax({
    // calibrateX: true,
    // calibrateY: true,
    // invertX: false,
    // invertY: true,
    limitX: 20,
    limitY: 10,
    // scalarX: 2,
    // scalarY: 8,
    // frictionX: 0.2,
    // frictionY: 0.8,
    // originX: 0.0,
    // originY: 1.0
  });
};
