$( document ).ready(function() {
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  var cumulativePath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=195339920&single=true&output=csv';
  var geomData, geomFilteredData, globalData, cumulativeData, timeseriesData, date, totalCases, totalDeaths = '';
  var countryCodeList = [];
  var numFormat = d3.format(",");

  var viewportWidth = window.innerWidth;
  var viewportHeight = $('main').outerHeight() - $('header').outerHeight();
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
      $('.date span').html(date);

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

    $('.stats-global').html('<h4>Global Figures: ' + numFormat(globalData['confirmed cases']) + ' total confirmed cases, ' + numFormat(globalData['deaths']) + ' total confirmed deaths</h4>');

    totalCases = d3.sum(cumulativeData, function(d) { return d['confirmed cases']; });
    totalDeaths = d3.sum(cumulativeData, function(d) { return d['deaths']; });
    createKeyFigure('.stats-priority', 'Total Confirmed Cases', 'cases', totalCases);
    createKeyFigure('.stats-priority', 'Total Confirmed Deaths', 'deaths', totalDeaths);
    createKeyFigure('.stats-priority', 'Total Locations', 'locations', cumulativeData.length);
  }

  function createKeyFigure(target, title, className, value) {
    var targetDiv = $(target);
    return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div><p class='date small'><span>"+ date +"</span></p></div></div></div>");
  }

  function initMap(){
    drawMap();
    createMapLegend();
  }

  function createMapLegend() {
    var max = d3.max(cumulativeData, function(d) { return +d['confirmed cases']; })

    var cases = d3.select('.legend-inner').append('svg')
      .attr('width', 200)
      .attr('height', 100);

     cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(0,8)')
      .text('Number of confirmed cases')
      .call(wrap, 100);

    cases.append('circle')
      .attr('class', 'count-marker')
      .attr('r', 2)
      .attr('transform', 'translate(10,45)');

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(7,82)')
      .text('1');

    cases.append("circle")
      .attr('class', 'count-marker')
      .attr('r', 15)
      .attr("transform", "translate(50,45)");

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(42,82)')
      .text(max);
  }

  var width, height, zoom, g, projection, markerScale;
  function drawMap(){
    width = viewportWidth;
    height = (isMobile) ? viewportHeight - 120 : viewportHeight;
    var mapScale = (isMobile) ? width/3.5 : width/5.5;
    var mapCenter = (isMobile) ? [10, -22] : [75, 8];

    var max = d3.max(cumulativeData, function(d) { return +d['confirmed cases']; } );
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
      .range([2, 15]);
        
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

    //create count markers
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
          return markerScale(+country[0]['confirmed cases']); 
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
    var h = ($('.tooltip-inner').outerHeight() <= 0) ? 80 : $('.tooltip-inner').outerHeight() + 20;
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

      //update map markers
      mapsvg.selectAll('circle').each(function(m){
        var marker = d3.select(this);
        cumulativeData.forEach(function(d){
          if (m.properties.ISO_A3 == d['Country Code']) {
            var r = markerScale(d['confirmed cases']);
            marker.transition().duration(500).attr('r', function (d) { 
              return (r/currentZoom);
            });
          }
        });
      });
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