// Dependencies
var Promise 	= require('promise');
var request 	= require('request');
var dbquery	= require('./dbquery.js');

var google_map_api = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=_LOCATION&radius=_RADIUS&type=_TYPE&key=AIzaSyCHtY3X8alDlbzNilleVSNS9ba5rhbpIh0';

// Place Object
function Place(p, type, rnum, rcost) {
	this.name = p.name;
//	this.icon = p.icon;
	this.location = p.geometry.location;
	this.type = type;
	this.resourceNum = Math.floor(Math.random() * (rnum.max-rnum.min+1) + rnum.min);
	this.resourceCost = Math.floor(Math.random() * (rcost.max-rcost.min+1) + rcost.min);
}

// Request Places from Google Places API
/*function RequestPlace(place_request, type) {
	return new Promise(function(resolve, reject) {
		place_request = place_request.replace('_TYPE',type);
		type = type.replace('_', ' ');
		console.log(place_request);
		request(place_request, function(error, response, body) {
			if(error) {
				return reject(error);
			}

			rtval = JSON.parse(body);
			facility = [];
			for(var j=0;j<rtval.results.length; j++)
			{
				var name = rtval.results[j].name.toLowerCase();
				if(name.includes(type)) {
					console.log(name);
					facility.push(new Place(rtval.results[j], type));
				}
			}

			return resolve(facility);
		});
	});
}*/

function PlaceQuery (location, radius, type) {
	url = google_map_api;
	url = url.replace('_LOCATION', location);
	url = url.replace('_TYPE', type);
	url = url.replace('_RADIUS', radius);

	return url;
}

function FilterResults(rtval, type, rnum, rcost, dbr, db)
{
	var facility = [];
	var name = "";
	var icon = "";
	var f_icon = "";
	var counter = 0;

	if(type == "fire_station")
	{
		for(var j=0;j<rtval.results.length; j++)
		{
			name = rtval.results[j].name.toLowerCase();
			type_ws = type.replace("_"," "); 
			if(name.includes(type_ws))
			{ 
				facility.push(new Place(rtval.results[j], type, rnum, rcost));
				dbquery.InsertFacility(dbr, facility[counter], db);
				counter++;
			}
		}
	}

	else
	{
		if(type == "hospital")
			f_icon = 'https://maps.gstatic.com/mapfiles/place_api/icons/doctor-71.png';
		if(type == "police")
			f_icon = 'https://maps.gstatic.com/mapfiles/place_api/icons/police-71.png';

		for(var j=0;j<rtval.results.length; j++)
		{
			name = rtval.results[j].name.toLowerCase();
			icon = rtval.results[j].icon;
			if(name.includes(type) && icon == f_icon)
			{ 
				facility.push(new Place(rtval.results[j], type, rnum, rcost));
				dbquery.InsertFacility(dbr, facility[counter], db);
				counter++;
			}
		}
	}

	return facility;
}

function FacilitiesSearch(url, type, rnum, rcost, dbr, db)
{
	return new Promise(function(resolve, reject) {
		request(url, function(error, response, body) {
			if(error) {
				return reject(error);
			}

			var rtval = JSON.parse(body);
			var filterFacilities = FilterResults(rtval, type, rnum, rcost, dbr, db);
			return resolve(filterFacilities);
		});
	});
}

//module.exports.RequestPlace = RequestPlace;
module.exports.PlaceQuery = PlaceQuery;
module.exports.FacilitiesSearch = FacilitiesSearch;
