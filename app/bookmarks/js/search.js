// ****************************
// SEARCH

var searchBookmarks = function(searchQuery) {
	var bookmarkArraySearched = [];

	$.each(bookmarkArray, function(index, bookmark) {
    if (bookmark.name.toLowerCase().indexOf(searchQuery) > -1 || bookmark.url.toLowerCase().indexOf(searchQuery) > -1) {
      bookmarkArraySearched.push(bookmark);
    }
  });

  if(searchQuery == '' || searchQuery == undefined) bookmarkArraySearched = bookmarkArray;

  displayBookmarks(false, bookmarkArraySearched);
}

$(document).on('keyup', '#search-wrapper input', function(event) {
  var searchQuery = $(this).val();
  // console.log(searchQuery);
	searchBookmarks(searchQuery);
});
