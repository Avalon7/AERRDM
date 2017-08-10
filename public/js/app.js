// Declares the initial angular module "meanMapApp". Module grabs other controllers and services.
var app = angular.module('meanMapApp', ['addCtrl', 'geolocation', 'gservice', 'ngMap']);
	app.service('mapService', function(){
		var map;
		this.setMap = function (myMap){
			map = myMap;
		};
		this.getMap = function(){
			if(map) return map;
			throw new Error("Map not defined");
		};
		this.getLatLng = function(){
			var center = map.getCenter();
		
			return{
				lat: center.lat(),
				lng: center.lng()
			};
		};

	});

app.controller('MyController', function(NgMap) {
  NgMap.getMap().then(function(map) {
    console.log(map.getCenter());
    console.log('markers', map.markers);
    console.log('shapes', map.shapes);
  });
});


// app.controller("meanMapApp", function($scope){
// 	$scope.openLeftNav = function(){
// 		$scope.
// 	};
// });

angular.module('meanMapApp', ['ngMap']).controller('GetCurr', function(NgMap){
	var vm = this;
	NgMap.getMap("map").then(function(map){
		vm.map = map;
	});
	
});





