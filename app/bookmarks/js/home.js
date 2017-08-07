// ****************************
// ADD BOOKMARK DOM

var addBookmarkDOM = function(id, name, url, pageId) {
	var $bookmarkEntry = $bookmarkEntryTemplate.clone();

  // Data id
	$bookmarkEntry.data('id', id);

  // Variables
  $bookmarkEntry.find('.name').val(name);
	$bookmarkEntry.find('.name').attr('title', name);
  $bookmarkEntry.find('.url').val(url);
  $bookmarkEntry.find('.url').attr('title', url);

  // Link
	$bookmarkEntry.find('.open-bookmark').attr('href', url);

  // Add DOM
  // $bookmarkEntry.prependTo('#bookmarks-list .page[data-id=' + pageId + ']');
	$bookmarkEntry.appendTo('#bookmarks-list .page[data-id=' + pageId + ']');
}


// ****************************
// GET BOOKMARK FROM DB

var displayBookmarks = function(keepSamePage, bookmarkArray) {
  var numberBookmarks = bookmarkArray.length;
  var numberPages = Math.ceil(numberBookmarks / ENTRIES_BY_PAGE);
  var prevCurrentId = $('.pageLink.active').data('id');
  // console.log(numberPages);

  // Reset old entries
  $('#bookmarks-list').empty();
  $('#paginationList').empty();

  // Add the pages
  for (var i = 0; i < numberPages; i++) {
    addPage(i);
  }

  // Add one page if empty
  if (numberPages == 0) addPage(0);

  // Add bookmarks to the pages
  var i = 0;
  var pageId = 0;
  var bookmarkArrayReverse = bookmarkArray.slice(0);

  $.each(bookmarkArrayReverse.reverse(), function(index, bookmark) {
    if (i % ENTRIES_BY_PAGE == 0 && i != 0) pageId++;
    addBookmarkDOM(bookmark.id, bookmark.name, bookmark.url, pageId);
    i++;
  });

  // We display last active page if needed
  if (keepSamePage) {
    if ($('.pageLink').last().data('id') < prevCurrentId) prevCurrentId = $('.pageLink').last().data('id');
    showPage(prevCurrentId);
  }
  else{
    // We display the first page
    showPage(0);
  }
}

var getBookmarks = function(keepSamePage) {
	$.get(AJAX_GET_PATH, function(data) {
		bookmarkArray = JSON.parse(data);
		// console.log(data);
		// console.log(bookmarkArray);
    	displayBookmarks(keepSamePage, bookmarkArray);
	});
}


// ****************************
// ADD BOOKMARK

var isInt = function(value) {
	return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

var addBookmarkDB = function(name, url) {
	console.log(name, url);
	$.post(AJAX_POST_PATH, {
			ajaxType: 1,
			name: name,
			url: url
		}
	).done(function(data) {
		if (isInt(data)) {
			console.log('Bookmark added successfully');
			// console.log(data);

			// Remove DOM
			// addBookmarkDOM(data, name, url, 0);

      bookmarkArray = {
        id: data,
        name: name,
        url: url,
      }

      console.log(bookmarkArray);

      // displayBookmarks();
      getBookmarks();
		}
		else{
			alert('Error : ' + data);
		}
	});
}

// Add a bookmark entry
$(document).on('click', '#add-bookmark', function(event) {
	var $addBookmarkWrapper = $(this).parents('#add-bookmark-wrapper');
	var name = $addBookmarkWrapper.find('.name').val();
	var url = $addBookmarkWrapper.find('.url').val();
  var $error = $addBookmarkWrapper.find('.error');

  // Check URL
  if (!validateURL(url)) {
    $error.text('Please enter a valid URL (http://www.example.com)');
    $error.show();
    $addBookmarkWrapper.find('.url').focus();
  }
  else{
    // Hide error
    $error.hide();
    // Add bookmark
    addBookmarkDB(name, url);
  }
});


// ****************************
// DELETE BOOKMARK

var deleteBookmark = function(id, $bookmarkEntry) {
  $.post(AJAX_POST_PATH, {
      ajaxType: 2,
      id: id,
    }
  ).done(function(data) {
    if (data == 1) {
      console.log('Bookmark deleted successfully');
      console.log(data);

      // Remove DOM
      // $bookmarkEntry.remove();
      // delete bookmarkArray[id]; 

      getBookmarks(true);
    }
    else{
      alert('Error : ' + data);
    }
  });
}

// Delete a bookmark entry
$(document).on('click', '.bookmark-entry .delete-bookmark', function(event) {
  var $bookmarkEntry = $(this).parents('.bookmark-entry');
  var id = $bookmarkEntry.data('id');

  deleteBookmark(id, $bookmarkEntry);
});


// ****************************
// EDIT BOOKMARK

var editBookmark = function(id, name, url, $bookmarkEntry) {
	$.post(AJAX_POST_PATH, {
			ajaxType: 3,
      id: id,
      name: name,
			url: url,
		}
	).done(function(data) {
		if (data == 1) {
			console.log('Bookmark edited successfully');
			console.log(data);

      // Disable inputs
      $bookmarkEntry.find('input').attr('disabled', true);
      $bookmarkEntry.find('input').removeClass('edit');

      // Show save button
      $bookmarkEntry.find('.save-bookmark').hide();
      $bookmarkEntry.find('.edit-bookmark').show();
		}
		else{
			alert('Error : ' + data);
		}
	});
}

// Edit a bookmark entry
$(document).on('click', '.bookmark-entry .edit-bookmark', function(event) {
  var $bookmarkEntry = $(this).parents('.bookmark-entry');

  // Enable inputs
  $bookmarkEntry.find('input').removeAttr('disabled');
  $bookmarkEntry.find('input').addClass('edit');

  // Focus name input
  $bookmarkEntry.find('.name').focus();

  // Show save button
  $(this).hide();
  $bookmarkEntry.find('.save-bookmark').show();
});

// Save a bookmark entry
$(document).on('click', '.bookmark-entry .save-bookmark', function(event) {
	var $bookmarkEntry = $(this).parents('.bookmark-entry');
	var id = $bookmarkEntry.data('id');
  var name = $bookmarkEntry.find('.name').val();
  var url = $bookmarkEntry.find('.url').val();
  var $error = $bookmarkEntry.find('.error');

  // Check URL
  if (!validateURL(url)) {
    $error.text('Please enter a valid URL (http://www.example.com)');
    $error.show();
    $bookmarkEntry.find('.url').focus();
  }
  else{
    // Hide error
    $error.hide();
    // Edit bookmark
    editBookmark(id, name, url, $bookmarkEntry);
  }
});


// ****************************
// Document ready, load bookmarks

$(document).ready(function() {

	getBookmarks();

});
