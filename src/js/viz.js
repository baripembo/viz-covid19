$( document ).ready(function() {
  var isMobile = $(window).width()<600? true : false;
  var geomPath = 'data/worldmap.json';
  var coordPath = 'data/coordinates.csv';
  var whoPath = 'data/covid-19-cases-by-country.csv';
  var geomData, coordData, whoData, hrpData = '';

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight - 168;//- $('.key-figures').height() - $('footer').height();
  var tooltip = d3.select(".tooltip");

  function getData() {
    Promise.all([
      d3.csv(coordPath),
      d3.json(geomPath),
      d3.csv(whoPath)
    ]).then(function(data){
      //parse coord data
      coordData = [];
      data[0].forEach(function(d, i){
        var obj = {
          country: d['Preferred Term'],
          country_code: d['ISO 3166-1 Alpha 3-Codes'],
          lon: d['Longitude'], 
          lat: d['Latitude']
        }
        coordData.push(obj);
      });
        
      //parse geom data
      geomData = topojson.feature(data[1], data[1].objects.geom);
      //create list of hrp countries
      geomFilteredData = [];
      geomData.features.forEach(function(country) {
        countryList.forEach(function(c){
          if (country.properties.NAME_LONG == c) {
            geomFilteredData.push(country);
          }
        });
      });

      whoData = data[2];
      whoData.forEach(function(d) {
          d.cum_conf = parseInt(d.cum_conf);
      });
      //create list of hrp countries
      hrpData = [];
      whoData.forEach(function(country) {
        countryList.forEach(function(c){
          if (country.ADM0_NAME == c)
            hrpData.push(country);
        });
      });

      //create vis elements
      initMap();
      initKeyFigures();

      //remove loader and show vis
      $('.loader').hide();
      $('main, footer').css('opacity', 1);
    });
  }

  function initKeyFigures() {
    var totalCases = d3.sum(hrpData, function(d) { return d.cum_conf; });
    var totalDeaths = d3.sum(hrpData, function(d) { return d.cum_death; });

    $('.key-figures').append('<div class="key-figure"><span>'+ hrpData.length +'</span> countries</div>');
    $('.key-figures').append('<div class="key-figure"><span>'+ totalCases +'</span> confirmed cases</div>');
    $('.key-figures').append('<div class="key-figure"><span>'+ totalDeaths +'</span> deaths</div>');
  }

  function initMap(){
    drawMap();

    $('.close-button').on('click', function() {
      $('.modal').hide();
    });
  }

  function getCoords(code){
    var coords = {};
    coordData.forEach(function(c){
      if (c.country_code==code){
        coords.country = c.country;
        coords.lat = c.lat;
        coords.lon = c.lon;
      }
    });
    return coords;
  }

  var width, height, zoom, g, projection;
  function drawMap(){
    width = viewportWidth;
    height = viewportHeight;
    var mapScale = width/3.25;
    var mapCenter = [15, 10];

    var max = d3.max(hrpData, function(d) { return d.cum_conf; } );
    var color = d3.scaleLinear().domain([0, max]).range(['beige', 'red']);

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
    // var tweetMax = d3.max(tweetCountryData, function(d){ return +d.value; } );
    // rlog = d3.scaleLog()
    //   .domain([1, tweetMax])
    //   .range([2, 20]);

    // symbolScale = d3.scaleLinear()
    //   .domain([1, 2,  3,  4,  5,  6,  7,  8])
    //   .range([75, 20, 10, 5, 3, 2, 1, 1]);
        
    //draw map
    g = mapsvg.append("g");
    g.selectAll("path")
    .data(geomData.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      .attr("fill", function(d) { 
        var num = -1;
        hrpData.forEach(function(country){
          if (country.ADM0_NAME == d.properties.NAME_LONG) 
            num = country.cum_conf;
        });
        var clr = (num<0) ? '#999' : color(num);
        return clr;
      })
      .attr("d", path)
      // .on("mouseover", function(d){ 
      //   var included = false;
      //   countryList.forEach(function(c){
      //     if (c==d.properties.NAME_LONG) included = true;
      //   });
      //   if (included){
      //     tooltip.style("opacity", 1); 
      //   }
      // })
      // .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      // .on("mousemove", function(d) {
      //   var included = false;
      //   countryList.forEach(function(c){
      //     if (c==d.properties.NAME_LONG) included = true;
      //   });
      //   if (included){
      //     createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
      //   }
      // })
      .on("click", function(d) {
        var countryData; 
        hrpData.forEach(function(country){
          if (country.ADM0_NAME == d.properties.NAME_LONG) 
            countryData = country;
        });
        if (countryData != undefined) {
          $('.modal').find('h3').html(countryData.ADM0_NAME);
          $('.modal').find('p').html(countryData.cum_conf + " confirmed cases<br/>"+countryData.cum_death+" deaths");
          $('.modal').show();
        }
      });

    //country labels
    g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return d.properties.NAME_LONG; });

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

    var num = -1;
    hrpData.forEach(function(country){
      if (country.ADM0_NAME == country_name) 
        num = country.cum_conf;
    });


    var w = $('.tooltip').outerWidth();
    var h = $('.tooltip-inner').outerHeight() + 20;
    tooltip.select("div").html("<label class='label-header'>" + country_name + "</label>: "+num);
    tooltip
      .style("height", h + "px")
      .style("left", (d3.event.pageX - w/2) + "px")
      .style("top", (d3.event.pageY - h - 15) + "px")
      .style("text-align", "left")
      .style("opacity", 1);
  }

  function zoomed(){
    const {transform} = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
      g.attr("transform", transform);
      g.attr("stroke-width", 1 / transform.k);

      mapsvg.selectAll(".country-label")
        .style("font-size", function(d) { return 12/transform.k+"px"; });

      // updateTweetMarkers(tweetCountryData);

      // mapsvg.selectAll(".event-marker")
      //   .transition().duration(0)
      //   .attr("d", d3.symbol().type(d3.symbolTriangle).size(symbolScale(transform.k)));
    }
  }

  function clicked(d){
    var offsetX = (isMobile) ? 0 : 50;
    var offsetY = (isMobile) ? 0 : 25;
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    //d3.event.stopPropagation();
    mapsvg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(5, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2 + offsetX, -(y0 + y1) / 2 - offsetY),
      d3.mouse(mapsvg.node())
    );
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