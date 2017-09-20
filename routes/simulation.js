// Dependencies
var Promise 	= require('promise');
var dbquery		= require('./dbquery.js');
var Heap		= require('heap');
var Mongodb		= require('mongodb');

function FindMobileResources(sim_details, type, db)
{
	return new Promise(function(resolve, reject) {
		dbquery.FindFacilities(db, sim_details._id, type, function (err, facilities) {
			if(err)
				return reject(err);

			var mobileResources = [];

			var heap = new Heap(function(a, b) {
				return a.Cost - b.Cost;
			});		
		
			for(var i = 0; i < facilities.length; i++)
			{
				for(var j = 0; j < facilities[i].Place.resourceNum; j++)
				{
					var temp = new CreateMobileResource(sim_details, facilities[i]);
					heap.push(temp);
				}
			}

			for(var i = 0; i <  sim_details.RequiredResources[type].num; i++)
			{
				mobileResources.push(heap.pop());					
			}

			//console.log(JSON.stringify(mobileResources) + "\n\n");
			console.log(type + " finish");
			return resolve(mobileResources);
		});
	});
}

function CreateMobileResource(sim_details, facility)
{
	this.id = new Mongodb.ObjectId();
	this.Location = facility.Place.location;
	this.Expenditure = Math.random() * (sim_details.Expenditure.max-sim_details.Expenditure.min+1) + sim_details.Expenditure.min;
	this.Expenditure = this.Expenditure.toFixed(2);
	this.Velocity = Math.random() * (sim_details.Velocity.max-sim_details.Velocity.min+1) + sim_details.Velocity.min;
	this.Cost = Cost(sim_details, this);
	//Insert into database
//	//console.log(this);
}

function Cost(sim_details, resource)
{
	var w_t = sim_details.Severity / 5;
	var w_m = 1 - w_t;
	var Lsplit = sim_details.Location.split(",");
	var distance = Distance({lat:Lsplit[0], lng:Lsplit[1]}, resource.Location);
	var E_t = Normalisation(distance, 0, sim_details.Radius);
	var E_m = Normalisation(resource.Expenditure, sim_details.Expenditure.min, sim_details.Expenditure.max);
	var dline = Deadline(distance, resource.Velocity, sim_details.Deadline);
	var cost = w_t*E_t+w_m*E_m*dline;
	//console.log(cost);
	return cost; 
}

function Normalisation(x, min, max)
{
	return (x-min)/(max-min);
}

function Distance(loc1, loc2)
{
	var radius = 6371e3;	
	var lat1 = loc1.lat * Math.PI / 180;
	var lat2 = loc2.lat * Math.PI / 180; 
	var latdiff = (loc2.lat - loc1.lat) * Math.PI / 180;
	var lngdiff = (loc2.lng - loc1.lng) * Math.PI / 180; 

	var a = Math.sin(latdiff/2) * Math.sin(latdiff/2) + Math.cos(lat1) * Math.cos(lat2) *
			Math.sin(lngdiff/2) * Math.sin(lngdiff/2);

	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return radius*c;
}

function Deadline(distance, velocity, deadline)
{
	var t = distance/velocity;

	if (t <= deadline)
		return 1;

	else
		return Infinity;
}

module.exports.FindMobileResources = FindMobileResources;