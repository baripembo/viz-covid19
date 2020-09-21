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