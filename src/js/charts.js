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
  var dateSet = new Set();
  var timeseriesArray = [];
  var dataArray = Object.entries(data);
  dataArray.forEach(function(d) {
    var countryArray = [];
    countryArray.push(d[0])
    var valueArray = d[1];
    if (valueArray!=undefined) {
      valueArray.forEach(function(val) {
        dateSet.add(val['#date+reported']);
        countryArray.push(val['#affected+infected'])
      });
    }
    timeseriesArray.push(countryArray);
  });

  var dateArray = [];
  dateSet.forEach(function(d) {
    var date = new Date(d);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    dateArray.push(utcDate);
  });
  
  //set last updated date
  var lastUpdated = d3.max(dateArray);
  var date = getMonth(lastUpdated.getUTCMonth()) + ' ' + lastUpdated.getUTCDate() + ', ' + lastUpdated.getFullYear();
  $('.date span').html(date);

  dateArray.unshift('x')
  timeseriesArray.unshift(dateArray);

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

