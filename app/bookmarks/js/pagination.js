// ****************************
// PAGINATION

var addPage = function(id) {
  // Page
  var $page = $('<ul>')
                    .attr('data-id', id)
                    .addClass('page');

  $page.appendTo('#bookmarks-list');

  // Pagination
  var $pagination = $('<li>')
                        .attr('data-id', id)
                        .addClass('pageLink')
                        .text(id + 1);

  $pagination.appendTo('#paginationList');
}

var showPage = function(id) {
  // Display this page
  $('.page').hide();
  $('.page[data-id=' + id + ']').show();

  // Pagination
  $('.pageLink').removeClass('active');
  $('.pageLink[data-id=' + id + ']').addClass('active');

  // Display prev or next?
  $('#next, #prev').show();
  if ($('.pageLink').first().data('id') == id) {
    $('#prev').hide();
  }
  if ($('.pageLink').last().data('id') == id) {
    $('#next').hide();
  }
}

// Click on a pagination link
$(document).on('click', '.pageLink', function(event) {
  var id = $(this).data('id');
  showPage(id);
});

// Click on prev
$(document).on('click', '#prev', function(event) {
  var id = $('.pageLink.active').data('id');
  showPage(id - 1);
});

// Click on next
$(document).on('click', '#next', function(event) {
  var id = $('.pageLink.active').data('id');
  showPage(id + 1);
});
