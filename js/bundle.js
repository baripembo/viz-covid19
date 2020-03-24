window.$ = window.jQuery = require('jquery');
function initBarCharts(data) {
	var countries = new Set();
	countries.add('x');
	//group data by indicator
	var groupByIndicator = d3.nest()
    .key(function(d){ return d['Indicator']; })
    .key(function(d) { 
    	countries.add(d['Country']);
    	return d['ISO3']; 
    })
    .entries(data);
  countries = Array.from(countries);

  //format data for chart
  groupByIndicator.forEach(function(indicator, index) {
  	var chartName = 'indicator' + index;
  	var arr = [indicator.key];
  	indicator.values.forEach(function(v) {
  		arr.push(v.values[0].Value);
  	});
  	$('.indicator-charts').append('<div class="indicator-chart '+ chartName + '"></div>');
  	
		createBarChart(chartName, countries, arr);
  });

}

function createBarChart(name, countries, values) {
	var chart = c3.generate({
    bindto: '.' + name,
    title: {
  		text: values[0]
		},
		data: {
			x: 'x',
			columns: [
				countries,
				values
			],
			type: 'bar'
		},
		bar: {
			width: {
				ratio: 0.5 
			}
		},
    axis: {
      rotated: true,
      x: {
      	type: 'category'
      }
    },
    legend: {
      show: false
    }
	});
}


function initTimeseries(data) {
	//group the data by country
  var groupByCountry = d3.nest()
    .key(function(d){ return d['Country']; })
    .key(function(d) { return d['Date']; })
    .entries(data);
  groupByCountry.sort(compare);

  //group the data by date
  var groupByDate = d3.nest()
    .key(function(d){ return d['Date']; })
    .entries(data);

  var dateArray = ['x'];
  groupByDate.forEach(function(d) {
  	dateArray.push(new Date(d.key));
  });

  var timeseriesArray = [];
  timeseriesArray.push(dateArray);

  groupByCountry.forEach(function(country, index) {
  	var arr = [country.key];
  	var val = 0;
		groupByDate.forEach(function(d) {
			country.values.forEach(function(e) {
				if (d.key == e.key) {
					val = e.values[0]['confirmed cases'];
				}
			});
			arr.push(val);
		});
  	timeseriesArray.push(arr);
  });

  createTimeSeries(timeseriesArray)
}

var timeseriesChart;
function createTimeSeries(array) {
	timeseriesChart = c3.generate({
    padding: {
      top: 20,
      left: 25,
    },
    bindto: '.timeseries-chart',
    title: {
  		text: 'Number of Confirmed Cases Over Time',
  		position: 'upper-left',
		},
		data: {
			x: 'x',
			columns: array
		},
    point: {
      show: false
    },
		axis: {
			x: {
				type: 'timeseries',
				tick: {
				  format: '%-m/%-d/%y'
				}
			},
			y: {
				min: 0,
				padding: { top:0, bottom:0 }
			}
		},
		tooltip: {
  		grouped: false
		},
    transition: {
      duration: 100
    }
	});
}
var countryList = [
    "Afghanistan",
    "Burkina Faso",
    "Burundi",
    "Cameroon",
    "Central African Republic",
    "Chad",
    "Democratic Republic of the Congo",
    "Ethiopia",
    "Haiti",
    "Iraq",
    "Libya",
    "Mali",
    "Myanmar",
    "Niger",
    "Nigeria",
    "occupied Palestinian territory",
    "Somalia",
    "South Sudan",
    "Sudan",
    "Syria",
    "Ukraine",
    "Venezuela (Bolivarian Republic of)",
    "Yemen"
];

// var countryList = [
//     "AFG",
//     "BFA",
//     "BDI",
//     "CMR",
//     "CAF",
//     "TCD",
//     "COD",
//     "ETH",
//     "HTI",
//     "IRQ",
//     "LBY",
//     "MLI",
//     "MMR",
//     "NER",
//     "NGA",
//     "PSE",
//     "SOM",
//     "SSD",
//     "SDN",
//     "SYR",
//     "UKR",
//     "VEN",
//     "YEM"
// ];

function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function getMonth(m) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[m];
}

function compare(a, b) {
  const keyA = a.key.toLowerCase();
  const keyB = b.key.toLowerCase();

  let comparison = 0;
  if (keyA > keyB) {
    comparison = 1;
  } else if (keyA < keyB) {
    comparison = -1;
  }
  return comparison;
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 0.9, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", +lineHeight + "em").text(word);
      }
    }
  });
}
$( document ).ready(function() {
  var isMobile = $(window).width()<600? true : false;
  var geomPath = 'data/worldmap.json';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShO-ufDTcYrZq_4PlWUTJE_KmB8eg07kIwjLLYjguteCwgU4rD2jXsDvYsuCxIPNP7lquqK0x7uyfM/pub?gid=2070563594&single=true&output=csv';
  var cumulativePath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShO-ufDTcYrZq_4PlWUTJE_KmB8eg07kIwjLLYjguteCwgU4rD2jXsDvYsuCxIPNP7lquqK0x7uyfM/pub?gid=1729792256&single=true&output=csv';
  var geomData, geomFilteredData, globalData, cumulativeData, timeseriesData, date, totalCases, totalDeaths = '';
  var countryCodeList = [];
  var numFormat = d3.format(".2s");

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight - $('header').outerHeight();
  var tooltip = d3.select(".tooltip");

  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.csv(cumulativePath),
      d3.csv(timeseriesPath)
    ]).then(function(data){
      //parse data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      cumulativeData = data[1];
      timeseriesData = data[2];

      //get list of priority countries
      cumulativeData.forEach(function(item, index) {
        if (item['Country'] != 'Global') {
          countryCodeList.push(item['Country Code']);
        }
        else {
          //extract global data
          globalData = item;
          cumulativeData.splice(index, 1);
        }
      });

      //filter for priority countries
      geomFilteredData = geomData.features.filter((country) => countryCodeList.includes(country.properties.ISO_A3));
    
      //set last updated date
      var d = new Date(cumulativeData[0].last_updated);
      date = getMonth(d.getMonth()) + ' ' + d.getUTCDate() + ', ' + d.getFullYear();
      $('.date').html(date);
      
      //set heights
      $('.content').css('margin-top', $('header').outerHeight());

      //create vis elements
      initPanel();
      initMap();
      initTimeseries(timeseriesData);

      //remove loader and show vis
      $('.loader').hide();
      $('main, footer').css('opacity', 1);
    });
  }

  function initPanel() {
    $('.panel').find('h2 a').on('click', function() {
      resetPanel();
    });

    createKeyFigure('.stats-global', 'Global Confirmed Cases', 'global-cases', numFormat(globalData['confirmed cases']));
    createKeyFigure('.stats-global', 'Global Confirmed Deaths', 'global-deaths', numFormat(globalData['deaths']));
    createKeyFigure('.stats-global', 'Total Countries', 'global-locations', globalData['n_countries']);

    totalCases = d3.sum(cumulativeData, function(d) { return d['confirmed cases']; });
    totalDeaths = d3.sum(cumulativeData, function(d) { return d['deaths']; });
    createKeyFigure('.stats-priority', 'Total Confirmed Cases', 'cases', totalCases);
    createKeyFigure('.stats-priority', 'Total Confirmed Deaths', 'deaths', totalDeaths);
    createKeyFigure('.stats-priority', 'Total Locations', 'locations', cumulativeData.length);
  }

  function createKeyFigure(target, title, className, value) {
    var targetDiv = $(target);
    return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div><p class='date small'>"+ date +"</p></div></div></div>");
  }

  function initMap(){
    drawMap();
    createMapLegend();
  }

  function createMapLegend() {
    var max = d3.max(cumulativeData, function(d) { return +d['confirmed cases']; })

    var cases = d3.select('.legend-inner').append('svg')
      .attr('width', 200)
      .attr('height', 80);

     cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(0,8)')
      .text('Number of confirmed cases');

    cases.append('circle')
      .attr('class', 'count-marker')
      .attr('r', 2)
      .attr('transform', 'translate(10,38)');

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(7,78)')
      .text('1');

    cases.append("circle")
      .attr('class', 'count-marker')
      .attr('r', 20)
      .attr("transform", "translate(50,38)");

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(42,78)')
      .text(max);
  }

  var width, height, zoom, g, projection, markerScale;
  function drawMap(){
    width = viewportWidth;
    height = viewportHeight;
    var mapScale = width/5.5;
    var mapCenter = [75, 0];

    var max = d3.max(cumulativeData, function(d) { return d['confirmed cases']; } );
    // var step = max/3;
    // var color = d3.scaleQuantize()
    //   .domain([0, step, step*2, step*3])
    //   .range(d3.schemeReds[4]);

    projection = d3.geoMercator()
      .center(mapCenter)
      .scale(mapScale)
      .translate([width / 2, height / 2]);

    zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

    path = d3.geoPath().projection(projection);

    mapsvg = d3.select('#map').append('svg')
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .on("wheel.zoom", null)
      .on("dblclick.zoom", null);

    mapsvg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")

    //create log scale for circle markers
    markerScale = d3.scaleSqrt()
      .domain([1, max])
      .range([4, 20]);
        
    //draw map
    g = mapsvg.append("g");
    g.selectAll("path")
    .data(geomData.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      // .attr("fill", function(d) { 
      //   var country = whoFilteredData.filter(country => country.ADM0_NAME == d.properties.NAME_LONG);
      //   var num = (country[0] != undefined) ? country[0].cum_conf : -1;
      //   var clr = (num<0) ? '#E8E8E8' : color(num);
      //   return clr;
      // })
      .attr("d", path)
      .on("mouseover", function(d){ 
        var included = false;
        countryCodeList.forEach(function(c){
          if (c==d.properties.ISO_A3) included = true;
        });
        if (included){
          tooltip.style("opacity", 1); 
        }
      })
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) {
        var included = false;
        countryCodeList.forEach(function(c){
          if (c==d.properties.ISO_A3) included = true;
        });
        if (included){
          createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
        }
      })
      .on("click", function(d) {
        var country = cumulativeData.filter(country => country['Country Code'] == d.properties.ISO_A3);
        updatePanel(country[0]);
      });

    //country labels
    g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", "1em")
        .text(function(d) { return d.properties.NAME_LONG; })
        .call(wrap, 100);

     //create tweet markers
    var countMarker = g.append("g")
      .attr("class", "count-layer")
      .selectAll(".count-marker")
      .data(geomFilteredData)
      .enter()
        .append("g")
        .append("circle")
        .attr("class", "marker count-marker")
        .attr("r", function (d){ 
          var country = cumulativeData.filter(country => country['Country Code'] == d.properties.ISO_A3);
          return markerScale(country[0]['confirmed cases']); 
        })
        .attr("transform", function(d){ return "translate(" + path.centroid(d) + ")"; })
        .on("mouseover", function(){ tooltip.style("opacity", 1); })
        .on("mouseout", function(){ tooltip.style("opacity", 0); })
        .on("mousemove", function(d) {
          createMapTooltip(d.properties.ISO_A3, d.properties.NAME_LONG);
        })
        .on("click", function(d) {
          var country = cumulativeData.filter(country => country['Country Code'] == d.properties.ISO_A3);
          updatePanel(country[0]);
        });

    //tooltip
    mapTooltip = mapsvg.append("g")
      .attr("class", "tooltip");

    //zoom controls
    d3.select("#zoom_in").on("click", function() {
      zoom.scaleBy(mapsvg.transition().duration(500), 1.5);
    }); 
    d3.select("#zoom_out").on("click", function() {
      zoom.scaleBy(mapsvg.transition().duration(500), 0.5);
    });
  }

  function createMapTooltip(country_code, country_name){
    var country = cumulativeData.filter(c => c['Country Code'] == country_code);
    var cases = (country[0] != undefined) ? country[0]['confirmed cases'] : -1;
    var deaths = (country[0] != undefined) ? country[0]['deaths'] : -1;

    var w = $('.tooltip').outerWidth();
    var h = $('.tooltip-inner').outerHeight() + 20;
    tooltip.select('div').html("<label class='h3 label-header'>" + country_name + "</label>Cases: "+ cases +"<br/>Deaths: "+ deaths +"<br/>");
    tooltip
      .style('height', h + 'px')
      .style('left', (d3.event.pageX - w/2) + 'px')
      .style('top', (d3.event.pageY - h - 15) + 'px')
      .style('text-align', 'left')
      .style('opacity', 1);
  }

  function zoomed(){
    const {transform} = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
      g.attr('transform', transform);
      g.attr('stroke-width', 1 / transform.k);

      mapsvg.selectAll('.country-label')
        .style('font-size', function(d) { return 12/transform.k+'px'; });
    }
  }

  function updatePanel(country) {
    if (country != undefined) {
      $('.panel').find('h2 span').html(' > ' + country['Country']);
      $('.key-figure').find('.cases').html(country['confirmed cases']);
      $('.key-figure').find('.deaths').html(country['deaths']);
      $('.key-figure').find('.locations').html(country['n_countries']);
      //timeseriesChart.focus(country['Country']);
      timeseriesChart.hide();
      timeseriesChart.show(country['Country'], true);
    }
  }

  function resetPanel() {
    $('.panel').find('h2 span').html('');
    $('.key-figure').find('.cases').html(totalCases);
    $('.key-figure').find('.deaths').html(totalDeaths);
    $('.key-figure').find('.locations').html(cumulativeData.length);
    //timeseriesChart.focus();
    timeseriesChart.show();
  }

  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});