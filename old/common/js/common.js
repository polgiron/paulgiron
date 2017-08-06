$(document).ready(function($) {

    $( "#tabs" ).tabs({
        activate: function(event, ui) {
            window.location.hash = ui.newPanel.attr('id');
        }
    });

});
