// Constructor
PG.Main = function() {
  console.log('Init main constructor');

  var imageLoaded = [];
  // var imageDisplayed = [];
  var i = 0;

  $('.image-list__entry img').each(function(index, el) {
    $(this).attr('src', $(this).data('src'));
    $(this).load(function() {
      imageLoaded.push(index);

      if (imageLoaded.indexOf(i) != -1) {
        $('.image-list__entry').eq(i).addClass('is-loaded');
        imageLoaded.splice(i, 1);
        i++;
      }
    });
  });

  console.log('end');
  console.log(imageLoaded);
  imageLoaded.sort(function(a, b) {
    return a - b;
  });
  console.log(imageLoaded);
};

// Init function
// PG.Main.prototype.init_ = function() {
//
// };
