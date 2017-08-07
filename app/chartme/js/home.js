$(document).ready(function() {

  // ************************************************
  // CONST & VAR

  var RECT_VIEWPORT_HEIGHT = 250;
  var RECT_TOP_PADDING = 50;
  var RECT_BOTTOM_PADDING = 150;

  var paperWidth = 400;
  // var paperWidth = $('#chart').outerWidth();
  var PAPER_HEIGHT = RECT_VIEWPORT_HEIGHT + RECT_TOP_PADDING + RECT_BOTTOM_PADDING;

  var paperPaddingLeft = 15;
  var biggerLineLabel = 0;

  var RECT_SPACING = 20;
  var NUMBER_HORI_LINES = 8;


  // ************************************************
  // Function to draw the chart

  var drawChart = function(data){
    // We remove old graph
    $('#chart').remove();
    $('#chart-wrapper .content').append('<div id="chart"></div>');
    paperWidth = $('#chart').outerWidth();
    var paper = Raphael('chart', paperWidth, PAPER_HEIGHT);

    // Check the biggest value
    var biggestValue = 0;
    $.each(data, function(index, entry) {
      if(biggestValue < entry.value) biggestValue = entry.value;
    });

    // Draw ordinate lines and values
    var horiLines = [];
    for (var i = 0; i <= NUMBER_HORI_LINES; i++) {
      var lineY = (RECT_TOP_PADDING + RECT_VIEWPORT_HEIGHT) - (i * RECT_VIEWPORT_HEIGHT / (NUMBER_HORI_LINES - 1));
      var lineValue = (biggestValue / (NUMBER_HORI_LINES - 1)) * i;

      // Draw line
      var line = paper.path('m' + 0 + ', ' + lineY + ' L' + paperWidth + ', ' + lineY);

      // Dashed line
      var dashed = (i == 0) ? '' : '- ';
      line.attr({
        'stroke-dasharray': dashed,
        'stroke': '#555'
      });

      // LINE LABEL VALUE
      var label = paper.text(10, lineY, Math.ceil(lineValue));
      label.attr({
        'fill': '#555',
        'title': lineValue,
        'font-size': '12px',
        'text-anchor': 'end'
      });

      // Store line and label
      horiLines.push({
        line: line,
        label: label
      });

      // Set biggerLineLabel
      if (biggerLineLabel < label.getBBox().width){
        biggerLineLabel = label.getBBox().width;
        paperPaddingLeft = biggerLineLabel + 15;
      }
    }

    // We move the horiLines
    $.each(horiLines, function(index, entry) {
      entry.line.translate(paperPaddingLeft, 0);
      entry.label.translate(biggerLineLabel, 0);
    });

    // Add each value
    $.each(data, function(index, entry) {
      var entriesNumber = Object.size(data);;

      // RECT
      var rectHeight = entry.value * RECT_VIEWPORT_HEIGHT / biggestValue;
      var rectWidth = (paperWidth - paperPaddingLeft - RECT_SPACING - entriesNumber * RECT_SPACING) / entriesNumber;
      var rectX = paperPaddingLeft + RECT_SPACING + index * (rectWidth + RECT_SPACING);
      var rectY = PAPER_HEIGHT - RECT_BOTTOM_PADDING - rectHeight;

      // var rect = paper.rect(rectX, rectY, RECT_WIDTH, rectHeight);
      var rect = paper.rect(rectX, rectY, rectWidth, rectHeight);
      rect.attr({
        fill: entry.color,
        title: entry.value
      });

      // VALUE LABEL
      var label = paper.text(rectX + rectWidth / 2, PAPER_HEIGHT - RECT_BOTTOM_PADDING - rectHeight - 10, entry.value);
      label.attr('fill', '#555');
      label.attr('font-size', '12px');

      // LABEL
      var label = paper.text(rectX + rectWidth / 2, PAPER_HEIGHT - RECT_BOTTOM_PADDING + 15, entry.label);
      label.attr({
        'fill': '#555',
        'title': entry.label,
        'font-size': '12px',
        'text-anchor': 'start'
      });

      // Rotate the label
      label.rotate(45, rectX + rectWidth / 2, PAPER_HEIGHT - RECT_BOTTOM_PADDING + 15);
    });
  }


  // ************************************************
  // Init the chart

  var storedData = store.get('data');
  // console.log(storedData);

  if(storedData != undefined) data = storedData;

  $('#data').val(JSON.stringify(data, null, 4));
  drawChart(data.data);


  // ************************************************
  // Run the textarea

  $(document).on('click', '#run', function(event) {
    var data = $('#data').val();
    
    if(data != undefined && data != ''){
      data = JSON.parse(data.replace(/\r?\n/g, ''));
      // console.log(data);

      // Draw
      drawChart(data.data);

      // Store the data in the browser
      store.set('data', data);
    }
  });


  // ************************************************
  // Clear the textarea

  $(document).on('click', '#clear', function(event) {
    $('#data').val('');
    $('#chart').remove();
  });

  // Make the chart a bit responsive
  $(window).resize(function(event) {
    var data = $('#data').val();
    paperWidth = $('#chart').width();
    // console.log(paperWidth);
    
    if(data != undefined && data != ''){
      data = JSON.parse(data.replace(/\r?\n/g, ''));
      // console.log(data);

      // Draw
      drawChart(data.data);
    }
  });
});
