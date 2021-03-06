//Dependencies
var mongodb = require('mongodb');

url = 'mongodb://localhost:27017/passport';

// Required resources for event type and severity
function RequiredResources(db, category, severity, callback)
{
	//var resources = { };

	db.collection("EventTypeInfo").findOne({Category:category, Severity: severity}, {"Resources":1}, function(err, doc) {
		callback(err, doc.Resources);
	});	
}

// Required resources for event type and severity
function PromiseRequiredResources(db, category, severity)
{
	return new Promise(function(resolve, reject) {
		db.collection("EventTypeInfo").findOne({Category:category, Severity: severity}, {"Resources":1}, function(err, doc) {
			if(err)
			{
				return reject(err);
			}
			else
			{
				return resolve(doc.Resources);
			}
		});
	});
}

function UpdateLocation(db, req)
{
	var user = req.user;

	db.collection("users").updateOne({ "_id" : mongodb.ObjectId(user._id)}, 
		{
			$set: {			
			"Location" : {lat: req.body.lat, lng: req.body.lng},
			"Timestamp" : new Date()
			}
		}
	);
}

function FindAvaliableUser(db, sim_details, resource, callback)
{
	var date = new Date(new Date()-5*60000);
	var start = resource.Location.lat.toString();
	start = start.concat(",");
	start = start.concat(resource.Location.lng);
	var end = sim_details.Location.lat.toString();
	end = end.concat(",");
	end = end.concat(sim_details.Location.lng);
	console.log(date);
	db.collection("users").findOneAndUpdate({facility: resource.Facility, active:{$exists: false}, Timestamp: {$gt: date}}, 
		{$set: {active: { sim_id: sim_details._id, Severity: sim_details.Severity, Category: sim_details.Category,
				StartPoint: start, EndPoint: end, Deadline: sim_details.Deadline, Responded: false, Complete: false}
				}
		}, 
		function(err, doc) {
			console.log(doc.lastErrorObject.updatedExisting);
			if(doc.lastErrorObject.updatedExisting == true)
				callback(err, doc.value._id);
			else
				callback(err, null);
		}
	);
}

function CheckJobRequest(db, user_id, callback)
{
	db.collection("users").update({_id: mongodb.ObjectId(user_id)}, {$set: {Timestamp: new Date()}}, function() {
		console.log("update done");
		db.collection("users").find({_id: mongodb.ObjectId(user_id), "active.Complete": false}, {Location:1, active:1}).toArray(function (err, docs) {
			if(docs.length == 1)
			{
				if(docs[0].active.Responded == true)
				{
					var start = docs[0].Location.lat.toString();
					start = start.concat(",");
					start = start.concat(docs[0].Location.lng);
					docs[0].active.StartPoint = start;
				}
					
				callback(err, docs[0]);
			}
			else
				callback(err, false);
		});
	});
}

// Inserting the simulation into the database
function InsertSimulation(db, req, resources_list, radius, callback)
{
	var content = req.body;

	db.collection("Simulations").insertOne({Category: content.Category, Severity: content.Severity, 
		Location: content.Location, Expenditure: content.Expenditure,
		ResourceNum: content.ResourceNum, Deadline: content.Deadline, RequiredResources: resources_list, 
		Radius: radius, start: new Date(), Initiator: req.connection.remoteAddress, ResRequired: 0, ResWaitOn: 0},
		function (err, r) {
			callback(err, r);
		}); 
}

// Sets the simulated resource total
function SetSimResouceCount(db, sim_id, req_count, callback)
{
	db.collection("Simulations").updateOne({_id: mongodb.ObjectId(sim_id)}, {$set: {ResRequired: req_count, ResWaitOn: req_count}}, function (err, r)
	{
		callback(err, r);
	});
}


// Adds facility to database
function InsertFacility(db, dbr, place)
{
	db.collection("Facilities").insertOne({Sim_id: mongodb.ObjectId(dbr.insertedId), Place: place});
}

// Finds facilities from database
function FindFacilities(db, id, type, callback)
{
		db.collection("Facilities").find({Sim_id: mongodb.ObjectId(id), 'Place.type': type}, {Place: 1}).toArray(function (err, places) { 
		callback(err, places);
	});   

}

// The current active simulated resources, including mobile
function ActiveSims(db, req, callback)
{	
	db.collection("Simulations").find({active: {$exists: true}}).toArray(function(err, docs) {
		callback(err, docs);
	});
}

// Updates the gps across all mobile resources on frontend
function UpdatedGPS(db, sim_id, callback)
{
	db.collection("users").find({"active.sim_id": mongodb.ObjectId(sim_id)}, {_id: 1, Location: 1}).toArray(function(err, docs) {
		if(err)
			throw err;
	
		var resources = [];

		for(var i = 0; i < docs.length; i++)
		{
			resources[i] = {"id": docs[i]._id, "location":docs[i].Location};
		}

		callback(resources);
	});
}

// Job request response function, handling the response from mobile application's to the web server
function Response(db, user_id, sim_id, response, callback)
{
	console.log(response);

	if(response == "Accept")
	{
		db.collection("users").find({_id: mongodb.ObjectId(user_id), "active.sim_id": mongodb.ObjectId(sim_id), "active.Responded": false})
		.toArray(function (err, results)   
			{
				if(results.length == 1)
				{
					db.collection("users").updateOne({_id: mongodb.ObjectId(user_id)}, {$set: {"active.Responded": true}},
					function (err, update_results)
					{		
						callback(err, 0)
					});
				}

				else
				{
					callback(err, 1);
				}
			});
	}

	else
	{
		db.collection("Simulations").updateOne({_id: mongodb.ObjectId(sim_id), "Plan.User_id": user_id}, {$set: { "Plan.$.User_id": ""}}, 
		function(err) {
			db.collection("users").updateOne({_id: mongodb.ObjectId(user_id)}, {$unset: {active:""}}, function (err, update_results)
			{
				callback(err, 2);
			});
		});
	}
}

// Simulated resource response updater
function UpdateSimResponses(db, sim_id, update_value, callback)
{
	db.collection("Simulations").findOneAndUpdate({_id: mongodb.ObjectId(sim_id)}, {$inc: {ResWaitOn: update_value}}, 
		{returnOriginal: false}, function (err, results) {
			callback(err, results.value);
		}
	);
}

// Finding a simulation's details and statistics
function SimulationDetails(db, sim_id, callback)
{
	db.collection("Simulations").findOne({_id: mongodb.ObjectId(sim_id)}, function(err, details) {
		if(err)
			throw err;

		callback(err, details);
	});
}

// Stores the plan and relevant statistics
function SetPlan(db, sim_id, plan, stats, count, callback)
{

	db.collection("Simulations").updateOne({_id: mongodb.ObjectId(sim_id)}, {$set:{"Plan":plan, "Statistics":stats, ResWaitOn:count}}, function(err, results) {

		console.log("Plan saved.");
		callback(err, results);
	});
}

function MultiSetPlan(db, sim_id, plan, stats, insufficient, callback)
{

	db.collection("Simulations").updateOne({_id: mongodb.ObjectId(sim_id)}, {$set:{"Plan":plan, "Statistics":stats, "Insufficient":insufficient}}, function(err, results) {

		console.log("Plan saved.");
		callback(err, results);
	});
}

// Retrieves plan from database
function GetPlan(db, sim_id, callback)
{
	db.collection("Simulations").find({_id: mongodb.ObjectId(sim_id)}, {"Plan": 1}).toArray( 
	function (err, results)
	{
		if(err)
			throw err;
		console.log(results.length);
		if(results.length == 1)
			callback(err, results[0].Plan);
		else
			callback(err, null);
	});
}

// Retrieves stats from database
function GetStats(db, sim_id, callback)
{
	db.collection("Simulations").find({_id: mongodb.ObjectId(sim_id)}, {"Statistics": 1}).toArray( 
	function (err, results)
	{
		if(err)
			throw err;
		console.log(results.length);
		if(results.length == 1)
			callback(err, results[0].Statistics);
		else
			callback(err, null);
	});
}

// Reset user for new job requests using sim_id
function ResetUserBySimId(db, sim_id)
{
	db.collection("users").updateMany({"active.sim_id": mongodb.ObjectId(sim_id)}, {$unset: {active: ""}});
}

// Reset user using the user initiator
function ResetUserByInitiator(db, initiator)
{
	db.collection("Simulations").find({Initiator: initiator},{_id:1}).forEach(function(doc) {
		ResetUserBySimId(db, doc._id);
	});
}

// Insert the multi simulation into the database
function InsertMultiSimulation(db, req, radius, events, facilities, callback)
{
	var content = req.body;
	db.collection("Simulations").insertOne({Expenditure: content.Expenditure, ResourceNum: content.ResourceNum, 
		Radius: radius, start: new Date(), Initiator: req.connection.remoteAddress, Events: events, Facilities: facilities} ,
		function(err, r) {
			if(err)
				throw err;

			callback(r);
	}); 
}

// Handles user's finishing a job request
function FinishedJob(db, user_id, callback)
{
	db.collection("users").updateOne({ "_id" : mongodb.ObjectId(user_id), active: {$exists:true}}, 
		{
			$set: {			
			"active.Complete" : true,
			"Timestamp" : new Date()
			}
		},
		function(err, doc) {
			if (err)
				throw err;

			callback(doc);
		}
	);
}

// Check availability of user for multiple event simulation
function CheckAvaliabilityMulti(db, newRes, details)
{
	return new Promise(function(resolve, reject) {
		var date = new Date(new Date()-5*60000);
		var start = newRes.Location.lat.toString();
		start = start.concat(",");
		start = start.concat(newRes.Location.lng);
		var end = details.Location.lat.toString();
		end = end.concat(",");
		end = end.concat(details.Location.lng);
		console.log(date);
		db.collection("users").findOneAndUpdate({facility: newRes.Facility, active:{$exists: false}, Timestamp: {$gt: date}}, 
			{$set: {active: { sim_id: details._id, Severity: details.Severity, Category: details.Category,
					StartPoint: start, EndPoint: end, Deadline: details.Deadline, Responded: false, Complete: false}
					}
			}, 
			function(err, doc) {
				if(err)
					reject(err);
				console.log(doc.lastErrorObject.updatedExisting);
				if(doc.lastErrorObject.updatedExisting == true)
				{
					console.log(doc.value._id);
					newRes["user"]= doc.value._id;
				}
				else
				{
					console.log("null user");
					newRes["user"]= null;
				}
				resolve(err, newRes);
			}
		);
	});
}

module.exports.RequiredResources = RequiredResources;
module.exports.PromiseRequiredResources = PromiseRequiredResources;
module.exports.UpdateLocation = UpdateLocation;
module.exports.InsertSimulation = InsertSimulation;
module.exports.InsertFacility = InsertFacility;
module.exports.ActiveSims = ActiveSims;
module.exports.UpdatedGPS = UpdatedGPS;
module.exports.SimulationDetails = SimulationDetails;
module.exports.FindFacilities = FindFacilities;
module.exports.FindAvaliableUser = FindAvaliableUser;
module.exports.SetSimResouceCount = SetSimResouceCount;
module.exports.CheckJobRequest = CheckJobRequest;
module.exports.SetPlan = SetPlan;
module.exports.GetPlan = GetPlan;
module.exports.GetStats = GetStats;
module.exports.ResetUserByInitiator = ResetUserByInitiator;
module.exports.ResetUserBySimId = ResetUserBySimId;
module.exports.Response = Response;
module.exports.UpdateSimResponses = UpdateSimResponses;
module.exports.InsertMultiSimulation = InsertMultiSimulation;
module.exports.FinishedJob = FinishedJob;
module.exports.CheckAvaliabilityMulti = CheckAvaliabilityMulti;
module.exports.MultiSetPlan = MultiSetPlan;
