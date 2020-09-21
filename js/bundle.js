window.$ = window.jQuery = require('jquery');
function initBarCharts(data) {
	var countries = new Set();
	countries.add('x');
	//group data by indicator
	var groupByIndicator = d3.nest()
    .key(function(d){ return d['Indicator']; })
    .key(function(d) { 
    	countries.add(d['#country+name']);
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
  allTimeseriesArray = formatTimeseriesData(data);
  createTimeSeries(allTimeseriesArray);
}

function formatTimeseriesData(data) {
  var formattedData = [];
  var dataArray = Object.entries(data);
  dataArray.forEach(function(d) {
    d[1].forEach(function(row) {
      row['#country+name'] = d[0];
      formattedData.push(row)
    });
  });
  formattedData.reverse();

  //group the data by country
  var groupByCountry = d3.nest()
    .key(function(d){ return d['#country+name']; })
    .key(function(d) { return d['#date+reported']; })
    .entries(formattedData);
  groupByCountry.sort(compare);

  //group the data by date
  var groupByDate = d3.nest()
    .key(function(d){ return d['#date+reported']; })
    .entries(formattedData);

  var dateArray = [];
  groupByDate.forEach(function(d) {
    var date = new Date(d.key);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    dateArray.push(utcDate);
  });

  //format for c3 chart
  var timeseriesArray = [];
  timeseriesArray.push(dateArray);
  groupByCountry.forEach(function(country, index) {
    var arr = [country.key];
    var val = 0;
    groupByDate.forEach(function(d) {
      country.values.forEach(function(e) {
        if (d.key == e.key) {
          val = e.values[0]['#affected+infected'];
        }
      });
     if (val!=undefined) arr.push(val);
    });
    timeseriesArray.push(arr);
  });

  //set last updated date
  if ($('.date span').html()=='') {
    var lastUpdated = d3.max(dateArray);
    var date = getMonth(lastUpdated.getUTCMonth()) + ' ' + lastUpdated.getUTCDate() + ', ' + lastUpdated.getFullYear();
    $('.date span').html(date);
  }

  dateArray.unshift('x')
  return timeseriesArray;
}

var timeseriesChart;
function createTimeSeries(array) {
	timeseriesChart = c3.generate({
    padding: {
      top: 10,
      left: 35,
      right: 16
    },
    bindto: '.timeseries-chart',
    title: {
  		text: 'Number of Confirmed Cases Over Time',
  		position: 'upper-left',
		},
		data: {
			x: 'x',
			columns: array,
      type: 'spline'
		},
    color: {
        pattern: ['#1ebfb3', '#f2645a', '#007ce1', '#9c27b0', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    },
    spline: {
      interpolation: {
        type: 'basis'
      }
    },
    point: { show: false },
		axis: {
			x: {
				type: 'timeseries',
				tick: {
          count: 8,
				  format: '%-m/%-d/%y',
          outer: false
				}
			},
			y: {
				min: 0,
				padding: { top:0, bottom:0 },
        tick: { 
          outer: false,
          format: d3.format(".2s")
        }
			}
		},
    legend: {
      show: false,
      position: 'inset',
      inset: {
          anchor: 'top-left',
          x: 10,
          y: 0,
          step: 8
      }
    },
		tooltip: { grouped: false },
    transition: { duration: 300 }
	});

  createTimeseriesLegend();
}


function createTimeseriesLegend() {
  var names = [];
  timeseriesChart.data.shown().forEach(function(d) {
    names.push(d.id)
  });

  //custom legend
  d3.select('.timeseries-chart').insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      d3.select(this).select('span').style('background-color', timeseriesChart.color(id));
    })
    .on('mouseover', function(id) {
      timeseriesChart.focus(id);
    })
    .on('mouseout', function(id) {
      timeseriesChart.revert();
    });
}

function updateTimeseries(data, selected) {
  var updatedData = {};
  var timeseriesArray = [];
  if (selected != undefined) {  
    selected.forEach(function(country) {
      updatedData[country] = data[country];
    });
    timeseriesArray = formatTimeseriesData(updatedData);
  }
  else {
    timeseriesArray = allTimeseriesArray;
  }

  //load new data
  timeseriesChart.load({
    columns: timeseriesArray,
    unload: true,
    done: function() {
      $('.timeseries-legend').remove();
      createTimeseriesLegend();
    }
  });
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
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", + lineHeight + "em").text(word);
      }
    }
  });
}

function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}
$( document ).ready(function() {
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var geomData, geomFilteredData, globalData, cumulativeData, timeseriesData, allTimeseriesArray, date, totalCases, totalDeaths, descriptionText = '';
  var countryCodeList = [];
  var selectedCountries = [];
  var numFormat = d3.format(",");

  var page = window.location.href;
  var viewportWidth = window.innerWidth;
  var viewportHeight = $('main').outerHeight() - $('header').outerHeight();
  var tooltip = d3.select(".tooltip");

  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/covid_series/out_covidseries.json')
    ]).then(function(data){
      //parse data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      cumulativeData = data[1].cumulative;
      timeseriesData = data[1].timeseries;
      globalData = data[1].global[0];

      //get list of priority countries
      cumulativeData.forEach(function(item, index) {
        countryCodeList.push(item['#country+code']);
      });

      //filter for priority countries
      geomFilteredData = geomData.features.filter((country) => countryCodeList.includes(country.properties.ISO_A3));

      //create page link
      var embed = { text: 'See COVID-19 Pandemic page', link: 'https://data.humdata.org/event/covid-19' };
      var standalone = { text: 'Open fullscreen', link: 'https://data.humdata.org/visualization/covid19' };
      if (window.location !== window.parent.location) {
        createLink(standalone);
      }
      else {
        $('body').addClass('standalone');
        createLink(embed);
      }

      //create vis elements
      initPanel();
      initMap();
      initTimeseries(timeseriesData);

      //remove loader and show vis
      $('.loader').hide();
      $('main, footer').css('opacity', 1);
    });
  }


  /***********************/
  /*** PANEL FUNCTIONS ***/
  /***********************/
  function initPanel() {
    $('#reset').on('click', function() {
      resetViz();
    });

    if (isMobile) {
      descriptionText = $('.description').html() + '<a>show less</a>';
      $('.description').html(descriptionText);
      var shortDescriptionText = truncateString(descriptionText, 129) + ' <a>show more</a>';

      $('.description').on('click', function() {
        if ($(this).hasClass('collapse')) {      
          $(this).html(descriptionText).removeClass('collapse');
        }
        else {     
          $(this).html(shortDescriptionText).addClass('collapse');
        }
      });
    }

    if (globalData!=undefined)
      $('.stats-global').html('<h4>Global Figures: ' + numFormat(globalData['#affected+infected']) + ' total confirmed cases, ' + numFormat(globalData['#affected+killed']) + ' total confirmed deaths</h4>');

    totalCases = d3.sum(cumulativeData, function(d) { return d['#affected+infected']; });
    totalDeaths = d3.sum(cumulativeData, function(d) { return d['#affected+killed']; });
    createKeyFigure('.stats-priority', 'Total Confirmed Cases', 'cases', numFormat(totalCases));
    createKeyFigure('.stats-priority', 'Total Confirmed Deaths', 'deaths', numFormat(totalDeaths));
    createKeyFigure('.stats-priority', 'Total Locations', 'locations', cumulativeData.length);
  }

  function updatePanel(selected) {
    var updatedData = cumulativeData.filter((country) => selected.includes(country['#country+name']));
    var cases = d3.sum(updatedData, function(d) { return +d['#affected+infected']; } );
    var deaths = d3.sum(updatedData, function(d) { return +d['#affected+killed']; } );
    var locations = updatedData.length;

    if (updatedData.length > 0) {
      $('.key-figure').find('.cases').html(numFormat(cases));
      $('.key-figure').find('.deaths').html(numFormat(deaths));
      $('.key-figure').find('.locations').html(locations);
    }
  }
  /***********************/


  /*********************/
  /*** MAP FUNCTIONS ***/
  /*********************/
  var zoom, g, mapsvg, markerScale;

  function initMap(){
    setTimeout(function() {
      viewportHeight = $('.panel').height();
      drawMap();
      createMapLegend();
    }, 100);
  }

  function createMapLegend() {
    var max = d3.max(cumulativeData, function(d) { return +d['#affected+infected']; })

    var cases = d3.select('.legend-inner').append('svg')
      .attr('width', 95)
      .attr('height', 80);

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(0,8)')
      .text('Number of confirmed cases')
      .call(wrap, 100);

    cases.append('circle')
      .attr('class', 'count-marker')
      .attr('r', 2)
      .attr('transform', 'translate(10,43)');

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(7,75)')
      .text('1');

    cases.append("circle")
      .attr('class', 'count-marker')
      .attr('r', 15)
      .attr("transform", "translate(50,43)");

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(30,75)')
      .text(numFormat(max));
  }

  function drawMap(){
    var width = viewportWidth;
    var height = (isMobile) ? viewportHeight * .5 : viewportHeight;
    var mapScale = (isMobile) ? width/3.5 : width/5.5;
    var mapCenter = (isMobile) ? [10, 30] : [75, 8];

    var max = d3.max(cumulativeData, function(d) { return +d['#affected+infected']; } );

    var projection = d3.geoMercator()
      .center(mapCenter)
      .scale(mapScale)
      .translate([width / 2, height / 2]);

    zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

    var path = d3.geoPath().projection(projection);

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
      .range([2, 15]);
        
    //draw map
    g = mapsvg.append("g");
    g.selectAll("path")
    .data(geomData.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      .attr("id", function(d) {
        return d.properties.ISO_A3;
      })
      .attr("d", path)
      .on("mouseover", function(d){ 
        if (isHRP(d.properties.ISO_A3)){
          tooltip.style("opacity", 1); 
        }
      })
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) {
        if (isHRP(d.properties.ISO_A3)){
          createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
        }
      })
      .on("click", function(d) {
        if (isHRP(d.properties.ISO_A3))
          selectCountry(d);
      });

    //country labels
    var label = g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", function() {
          var dy = (isMobile) ? 0 : '1em';
          return dy;
        })
        .text(function(d) { return d.properties.NAME_LONG; })
        .call(wrap, 100);

    //create count markers
    var countMarker = g.append("g")
      .attr("class", "count-layer")
      .selectAll(".count-marker")
      .data(geomFilteredData)
      .enter()
        .append("g")
        .append("circle")
        .attr("class", "marker count-marker")
        .attr("id", function(d) {
          return d.properties.ISO_A3;
        })
        .attr("r", function (d){ 
          var country = cumulativeData.filter(country => country['#country+code'] == d.properties.ISO_A3);
          return markerScale(+country[0]['#affected+infected']); 
        })
        .attr("transform", function(d){ return "translate(" + path.centroid(d) + ")"; })
        .on("mouseover", function(){ tooltip.style("opacity", 1); })
        .on("mouseout", function(){ tooltip.style("opacity", 0); })
        .on("mousemove", function(d) {
          createMapTooltip(d.properties.ISO_A3, d.properties.NAME_LONG);
        })
        .on("click", function(d) {
          selectCountry(d);
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

  function selectCountry(d) {
    //update marker selection
    var marker = d3.select('.count-layer').select('#'+d.properties.ISO_A3);
    if (marker.classed('selected')) {
      marker.classed('selected', false);

      const index = selectedCountries.indexOf(d.properties.NAME_LONG);
      if (index > -1) {
        selectedCountries.splice(index, 1);
      }
    }
    else {
      marker.classed('selected', true);
      selectedCountries.push(d.properties.NAME_LONG);
    }

    //update panel
    if (selectedCountries.length < 1) {
      resetViz();
    }
    else {
      updatePanel(selectedCountries);
      updateTimeseries(timeseriesData, selectedCountries);
    }
  }

  function createMapTooltip(country_code, country_name){
    var country = cumulativeData.filter(c => c['#country+code'] == country_code);
    var cases = (country[0] != undefined) ? country[0]['#affected+infected'] : -1;
    var deaths = (country[0] != undefined) ? country[0]['#affected+killed'] : -1;

    var w = $('.tooltip').outerWidth();
    var h = ($('.tooltip-inner').outerHeight() <= 0) ? 80 : $('.tooltip-inner').outerHeight() + 20;
    tooltip.select('div').html("<label class='h3 label-header'>" + country_name + "</label>Cases: "+ numFormat(cases) +"<br/>Deaths: "+ numFormat(deaths) +"<br/>");
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

      //update map markers
      mapsvg.selectAll('circle').each(function(m){
        var marker = d3.select(this);
        cumulativeData.forEach(function(d){
          if (m.properties.ISO_A3 == d['#country+code']) {
            var r = markerScale(d['#affected+infected']);
            marker.transition().duration(500).attr('r', function (d) { 
              return (r/currentZoom);
            });
          }
        });
      });
    }
  }
  /*********************/


  /************************/
  /*** HELPER FUNCTIONS ***/
  /************************/
  function resetViz() {
    selectedCountries = [];
    $('.panel').find('h2 span').html('');
    $('.key-figure').find('.cases').html(numFormat(totalCases));
    $('.key-figure').find('.deaths').html(numFormat(totalDeaths));
    $('.key-figure').find('.locations').html(cumulativeData.length);
    
    updateTimeseries();

    $('.count-marker').removeClass('selected');
  }

  function createLink(type) {
    $('.link').find('a').attr('href', type.link);
    $('.link').find('span').html(type.text);
  }

  function createKeyFigure(target, title, className, value) {
    var targetDiv = $(target);
    return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div><p class='date small'><span>"+ date +"</span></p></div></div></div>");
  }

  function isHRP(country_code) {
    var included = false;
    countryCodeList.forEach(function(c){
      if (c==country_code) included = true;
    });
    return included;
  }
  /************************/


  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = window.location.hostname==='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  initTracking();
});