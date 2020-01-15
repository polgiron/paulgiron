PG.App = function() {
  if ($('body').hasClass('space')) {
    new PG.Particles();
  }
  else if ($('body').hasClass('cubes')) {
    new PG.Cubes();
    // new PG.CubesText();
  }
};

var app = new PG.App();
