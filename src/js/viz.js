$( document ).ready(function() {
  var isMobile = $(window).width()<600? true : false;
  var geomPath = 'data/worldmap.json';
  var whoPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBI8MZx7aNt8EjYqkeojTopZKwSYGWCSKUzyS9xobrS5Tfr9SQZ_4hrp3dv6bRGkHk2dld0wRrJIeV/pub?gid=0&single=true&output=csv';
  var indicatorsPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx1-TDlM6OFVsgimRikC9GNpNxkcOh8Ek9fqaMlek6MWturT1tNkJ8s9uA728SrOUPzd9pf9C0IpLf/pub?gid=1862203704&single=true&output=csv';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx1-TDlM6OFVsgimRikC9GNpNxkcOh8Ek9fqaMlek6MWturT1tNkJ8s9uA728SrOUPzd9pf9C0IpLf/pub?gid=849874571&single=true&output=csv';
  var geomData, geomFilteredData, whoFilteredData, indicatorData, timeseriesData, date = '';

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight - $('header').height();
  var tooltip = d3.select(".tooltip");

  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.csv(whoPath),
      d3.csv(indicatorsPath),
      d3.csv(timeseriesPath)
    ]).then(function(data){
      //parse geom data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      //filter for hrp countries
      geomFilteredData = geomData.features.filter((country) => countryList.includes(country.properties.NAME_LONG));

      //parse WHO data
      var whoData = data[1];
      whoData.forEach(function(d) {
          d.cum_conf = parseInt(d.cum_conf);
      });
      //filter for hrp countries
      whoFilteredData = whoData.filter((country) => countryList.includes(country.ADM0_NAME));

      indicatorData = data[2];
      timeseriesData = data[3];
    
      //set last updated date
      date = new Date(whoFilteredData[0].DateOfReport);
      $('.date').find('span').html(getMonth(date.getMonth()) + ' ' + date.getUTCDate() + ', ' + date.getFullYear());
      $('.panel').css('height', viewportHeight);

      //create vis elements
      initMap();
      initKeyFigures();
      initBarCharts(indicatorData);
      initTimeseries(timeseriesData);

      //remove loader and show vis
      $('.loader').hide();
      $('main, footer').css('opacity', 1);
    });
  }

  function initKeyFigures() {
    var totalCases = d3.sum(whoFilteredData, function(d) { return d.cum_conf; });
    var totalDeaths = d3.sum(whoFilteredData, function(d) { return d.cum_death; });

    $('.key-figures').append('<div class="key-figure"><span>'+ whoFilteredData.length +'</span><br/>countries</div>');
    $('.key-figures').append('<div class="key-figure"><span>'+ totalCases +'</span><br/>confirmed cases</div>');
    $('.key-figures').append('<div class="key-figure"><span>'+ totalDeaths +'</span><br/>deaths</div>');
  }

  function initMap(){
    drawMap();

    $('.close-button').on('click', function() {
      $('.modal').hide();
    });
  }

  var width, height, zoom, g, projection, rlog;
  function drawMap(){
    width = viewportWidth;
    height = viewportHeight;
    var mapScale = width/5.5;
    var mapCenter = [70, 15];

    var max = d3.max(whoFilteredData, function(d) { return d.cum_conf; } );
    var step = max/3;
    var color = d3.scaleQuantize()
      .domain([0, step, step*2, step*3])
      .range(d3.schemeReds[4]);

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
    rlog = d3.scaleLog()
      .domain([1, max])
      .range([2, 20]);
        
    //draw map
    g = mapsvg.append("g");
    g.selectAll("path")
    .data(geomData.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      .attr("fill", function(d) { 
        var country = whoFilteredData.filter(country => country.ADM0_NAME == d.properties.NAME_LONG);
        var num = (country[0] != undefined) ? country[0].cum_conf : -1;
        var clr = (num<0) ? '#E8E8E8' : color(num);
        return clr;
      })
      .attr("d", path)
      .on("mouseover", function(d){ 
        var included = false;
        countryList.forEach(function(c){
          if (c==d.properties.NAME_LONG) included = true;
        });
        if (included){
          tooltip.style("opacity", 1); 
        }
      })
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) {
        var included = false;
        countryList.forEach(function(c){
          if (c==d.properties.NAME_LONG) included = true;
        });
        if (included){
          createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
        }
      })
      .on("click", function(d) {
        // var country = whoFilteredData.filter(country => country.ADM0_NAME == d.properties.NAME_LONG);
        // if (countryData != undefined) {
        //   $('.modal').find('h3').html(country[0].ADM0_NAME);
        //   $('.modal').find('p').html(country[0].cum_conf + " confirmed cases<br/>"+country[0].cum_death+" deaths");
        //   $('.modal').show();
        // }
      });

    //country labels
    g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return d.properties.NAME_LONG; });

     //create tweet markers
    var countMarker = g.append("g")
      .attr("class", "count-layer")
      .selectAll(".count-marker")
      .data(whoFilteredData)
      .enter()
        .append("g")
        .append("circle")
        .attr("class", "marker count-marker")
        .attr("r", function (d){ return (d.cum_conf==0) ? 0 : rlog(d.cum_conf); })
        .attr("transform", function(d){ return "translate(" + projection([d.CENTER_LON, d.CENTER_LAT]) + ")"; })
        .on("mouseover", function(){ tooltip.style("opacity", 1); })
        .on("mouseout", function(){ tooltip.style("opacity", 0); })
        .on("mousemove", function(d) {
          createMapTooltip(d.ADM0_NAME, d.ADM0_NAME);
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
    var country = whoFilteredData.filter(c => c.ADM0_NAME == country_name);
    var cases = (country[0] != undefined) ? country[0].cum_conf : -1;
    var deaths = (country[0] != undefined) ? country[0].cum_death : -1;

    var w = $('.tooltip').outerWidth();
    var h = $('.tooltip-inner').outerHeight() + 20;
    tooltip.select('div').html("<label class='label-header'>" + country_name + "</label>Cases: "+ cases +"<br/>Deaths: "+ deaths +"<br/>");
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