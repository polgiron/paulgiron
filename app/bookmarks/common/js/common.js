// ****************************
// COMMON

var AJAX_POST_PATH = 'common/scripts/ajax_post_db.php';
var AJAX_GET_PATH = 'common/scripts/ajax_get_bookmarks.php';

var bookmarkArray = [];
var ENTRIES_BY_PAGE = 6;


// ****************************
// TEMPLATE

var $bookmarkEntryTemplate = $('<li>')
								.addClass('bookmark-entry')
								.append(
									$('<div>')
					                    .addClass('content')
					                    .append(
					                      $('<input>')
					                        .addClass('name')
					                        .attr('type', 'text')
					                        .attr('disabled', true),
					                      $('<input>')
					                        .addClass('url')
					                        .attr('type', 'url')
					                        .attr('disabled', true),
					                      $('<ul>')
					                        .addClass('tools-wrapper')
					                        .append(
					                          $('<li>')
					                            .addClass('save-bookmark')
					                            .append(
					                              $('<i>')
					                                .addClass('fa fa-fw fa-save') 
					                            ),
					                          $('<li>')
					                            .addClass('edit-bookmark')
					                            .append(
					                              $('<i>')
					                                .addClass('fa fa-fw fa-pencil') 
					                            ),
					                          $('<li>')
					                            .addClass('delete-bookmark')
					                            .append(
					                              $('<i>')
					                                .addClass('fa fa-fw fa-trash') 
					                            ),
					                          $('<li>')
					                            .append(
					                              $('<a>')
					                                .addClass('open-bookmark')
					                                .attr('target', '_blank')
					                                .append(
					                                  $('<i>')
					                                    .addClass('fa fa-fw fa-external-link')
					                                )
					                            )
					                        )
					                    ),
					                  $('<div>')
					                    .addClass('error')
					                    .text('This is an error')
								);


// ****************************
// VALIDATE URL

var validateURL = function(textval) {
  var urlregex = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])) {3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return urlregex.test(textval);
}
