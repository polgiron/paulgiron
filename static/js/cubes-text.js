PG.CubesText = function() {
  this.chars_ = [];

  this.addChars_('Paul Giron', '.heading-1');
  this.addChars_('Web developer', '.heading-2');
  this.addChars_('pol.giron@gmail.com', '.email');
  this.addChars_('+44 78 03 25 20 70', '.phone');
  this.addChars_('>space', '.theme-space');

  $('.cubes__title span').each(function(index, el) {
    this.chars_.push(el);
  }.bind(this));

  this.chars_.shuffle();

  $.each(this.chars_, function(index, el) {
    $(el).css('transitionDelay', 50 * index + 'ms');
  }.bind(this));

  setTimeout(function() {
    this.showChars_();
  }.bind(this), 50);
};

PG.CubesText.prototype.addChars_ = function(string, wrapper) {
  for (var i = 0; i < string.length; i++) {
    var char = $('<span/>').text(string.charAt(i));
    $(wrapper).append(char);
  }
};

PG.CubesText.prototype.showChars_ = function() {
  $('.cubes__title span').addClass('is-visible');
};

Array.prototype.shuffle = function() {
  var input = this;
  for (var i = input.length-1; i >=0; i--) {
    var randomIndex = Math.floor(Math.random()*(i+1));
    var itemAtIndex = input[randomIndex];
    input[randomIndex] = input[i];
    input[i] = itemAtIndex;
  }
  return input;
}
