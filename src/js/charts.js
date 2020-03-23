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
    .key(function(d){ return d['Country Code']; })
    .key(function(d) { return d['Date']; })
    .entries(data);

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
  	country.values.forEach(function(item) {
  		arr.push(item.values[0]['Cases']);
  	});
  	timeseriesArray.push(arr);
  });

  createTimeSeries(timeseriesArray)
}

function createTimeSeries(array) {
	var chart = c3.generate({
    bindto: '.timeseries-chart',
		data: {
			x: 'x',
			columns: array
		},
		axis: {
			x: {
				type: 'timeseries',
				tick: {
				  format: '%m-%d-%Y'
				}
			}
		}
	});
}