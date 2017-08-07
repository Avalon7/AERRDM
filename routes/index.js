// Dependencies
var express 	= require('express');
var router 	= express.Router();
var path 	= require('path');
var assert 	= require('assert');
var Promise 	= require('promise');
var gplace	= require('./gplace.js');


// Variables
var google_map_api = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=_LOCATION&radius=_RADIUS&type=_TYPE&key=AIzaSyCHtY3X8alDlbzNilleVSNS9ba5rhbpIh0';
var public_dir = __dirname.replace("/routes", "/public");

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){

	/* GET login page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
		res.render('index', { message: req.flash('message') });
	});

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		res.render('register',{message: req.flash('message')});
	});

	/* Handle Registration POST */
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
		res.render('home', { user: req.user });
	});

	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	router.get('/index.html', function(req, res, next) {
	    res.sendFile(path.join(public_dir + '/index.html'));
	});

	// GET map page.
	router.get('/map.html', function(req, res, next) {
	    res.sendFile(path.join(public_dir + '/map.html'));
	});

	// POST Google Places.
	router.post('/Simulate', function(req, res, next) {

		console.log(req.body);
		console.log(gplace.Test);
		var lat = req.body.lat;
		var lng = req.body.lng;
		var radius = req.body.radius;
		var place_request = google_map_api.replace('_LOCATION', lat + "," + lng);
		place_request = place_request.replace('_RADIUS', radius);
		console.log(place_request);
		var types = ["police", "hospital", "fire_station"];
		var promises = [];
		for(var i = 0; i < types.length; i++)
		{
			promises.push(gplace.RequestPlace(place_request, types[i]));
		}

		Promise.all(promises).then(function(allData) {
			var rtval = allData[0].concat(allData[1], allData[2]);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(JSON.stringify(rtval));
			return res.end();
		});	
	});

	return router;
}





