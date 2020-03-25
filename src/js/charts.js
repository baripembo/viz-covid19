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
    var date = new Date(d.key);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  	dateArray.push(utcDate);
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
      top: 10,
      left: 30,
      right: 20
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
          outer: false
        }
			}
		},
		tooltip: { grouped: false },
    transition: { duration: 100 }
	});
}