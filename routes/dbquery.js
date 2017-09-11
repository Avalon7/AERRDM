//Dependencies
var mongodb = require('mongodb');

url = 'mongodb://localhost:27017/passport';

// Required resources for event type and severity
function RequiredResources(db, category, severity)
{
	var resources = { };
	//query database based on category and severity and insert into resources
	resources.police = {num: 1, name: "Police Car"};
	resources.hospital = {num: 1, name: "Ambulence"};
	resources.fire_station = {num: 1, name: "Fire Truck"};
	return resources;
}

function UpdateLocation(req)
{
	var user = req.session.user;
	var db = req.db;

	db.collection("usersLocation").save({ "_id" : mongodb.ObjectId(user._id),
		"username" : user.username, 
		"sim_id" : mongodb.ObjectId(req.body.sim_id),
		"location" : req.body.location,
		"timestamp" : new Date()
	});
}

function InsertSimulation(req, callback)
{
	var db = req.db;
	var content = req.body;

	db.collection("Simulations").insertOne({Category: content.Category, Severity: content.Severity, 
		Location: content.Location, Expenditure: content.Expenditure, Velocity: content.Velocity,
		ResourceNum: content.ResourceNum, deadline: content.Deadline, start: new Date(), active: 1},
		function (err, r) {
			callback(err, r);
		}); 
}

function InsertFacility(dbr, place, db)
{
	console.log(place.name);
	db.collection("Facilities").insertOne({Sim_id: mongodb.ObjectId(dbr.insertedId), Place: place});

}

function ActiveSims(req, callback)
{
	var db = req.db;
	
	db.collection("Simulation").find({active: 1}).toArray(function(err, docs) {
		callback(err, docs)
	});
}

module.exports.RequiredResources = RequiredResources;
module.exports.UpdateLocation = UpdateLocation;
module.exports.InsertSimulation = InsertSimulation;
module.exports.InsertFacility = InsertFacility;

