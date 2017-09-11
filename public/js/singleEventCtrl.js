var app = angular.module('meanMapApp', ['ngRoute', 'ngMap', 'ngMaterial', 'ngDialog']);


app.controller('mainContrl', function(NgMap, $compile, $scope, $mdDialog, $http, $timeout, $interval, ngDialog){

	//map initialization
	var vm = this;
	var directionDisplay;
	var directionsService;
	var stepDisplay;


	var position;
	var marker = [];
	var polyline = [];
	var poly2 = [];
	var poly = null;
	var timerHandle = [];
	var startLoc = new Array();
	var facilitiesMarker = new Array();
	var endLoc;
	var startLocation = new Array();
	var endLocation = new Array();

	var speed = 0.000005, wait = 1;
	var infowindow = null;
	
	var myPano;
	var panoClient;
	var nextPanoId;

	NgMap.getMap("map").then(function(map){
		vm.map = map;
		vm.map.setZoom(10);
	});

	//put a marker by clicking mouse
	vm.placeMarker = function(e){
		if(vm.marker){
			vm.marker.setMap(null);
		}else{
			vm.marker = new google.maps.Marker({
				position: e.latLng,
				map: vm.map,
				draggable: true,
				
			});
		}
		//display the marker info
		var htmlElement = "	<div><div><p id=\"event-setting-header\">Single Event Setting</p></div> " + 
		"<div><button class=\"button continue-btn ripple\" ng-click=\"vm.setDataField()\">" + "Set event data" + "</button></div></div>"
		// var htmlElement = "<showTag></showTag>"
		//need to compile 
		vm.compiled = $compile(htmlElement)($scope)
		vm.marker.infoWin = new google.maps.InfoWindow({
			// content: "<showTag></showTag>"
			content: vm.compiled[0]
		});
		//show the infomation window
		vm.marker.addListener('click', function($scope){
			vm.marker.infoWin.open(vm.map, vm.marker);
		});
		//clear onclick event in marker
		google.maps.event.clearListeners(vm.map, 'click');

		//set info windows
		vm.lastOpenedInfoWindow = vm.marker.infoWin;

	}

	vm.closeInfoWin = function(){
		if (vm.lastOpenedInfoWindow) {
        	vm.lastOpenedInfoWindow.close();
    	}
	}
	vm.setDataField = function(){
		//change center view
		// vm.map.setZoom(25);
		vm.map.setCenter(vm.marker.position);
		// $scope.open = function(){
			
		// }
		//pop a form ask user set the input field

	}

	vm.category_list = ["Medical Help", "Urban Fire", "Chemical Leakage"];

	vm.levelGenerator = function(){
		return Math.floor((Math.random()*5)+1);
	}
	vm.categoryGenerator = function(){
		var size = vm.category_list.length;
		return Math.floor((Math.random()*size));
	}
	vm.expenditureGenerator = function(){
		var max = 70; 
		var min = 30
		return Math.floor((Math.random()*(max-min+1))+min);
	}
	vm.velocityGenerator = function(){
		var max = 65;
		var min = 30;
		return Math.floor((Math.random()*(max-min+1))+min);
	}
	vm.deadlineGenerator = function(){
		var max = 15;
		var min = 5;
		return Math.floor((Math.random()*(max-min+1))+min);
	}

	vm.factorGenerate = function(){
  		vm.level = vm.levelGenerator();
		vm.category = vm.categoryGenerator();
		vm.expenditure = vm.expenditureGenerator();
		vm.velocity = vm.velocityGenerator();
		vm.deadline = vm.deadlineGenerator();

		//Auto increment
		vm.eId = 001;

		vm.factor = {
			'ID': vm.eId,
			'Severity Level': vm.level,
			'Category': vm.category_list[vm.category],
			'Resource avg. expenditure': vm.expenditure,
			'Resource avg. velocity': vm.velocity,
			'Deadline': vm.deadline,
			'Location': vm.marker.position.toUrlValue()
		}
  	}

  	vm.progrssMenuOpen = function () {
	    ngDialog.open({ 
	      template: 'eventProgress.html',
	      overlay: false,
	      showClose: false,
	      scope: $scope,
	      className: 'ngdialog-theme-default progress-menu draggable'       
	    });
    };

	// now start the simulation
	vm.startSingleEvent = function(){
		// close factor menu
		$mdDialog.hide();

		vm.closeInfoWin();

		vm.progrssMenuOpen();

		// console.log($scope.factor);
		// vm.map.setZoom(16);
		vm.map.setCenter(vm.marker.position);

		// post data to back-end
		var eventData = {
			location: vm.marker.position,
			eventId: vm.eId,
			SeverityLevel: vm.level
		}
		$http({
		   method  : 'POST',
		   url     : '/singleEvent',
		//     // set the headers so angular passing info as form data (not request payload)
		   headers : { 'Content-Type': 'application/json' },
		   data    :  {
		               ID: vm.factor["ID"],
		               Severity: vm.factor["Severity Level"],
		               Category: vm.factor["Category"],
		               Expenditure: {min: 2, max: 10},
		               Velocity: {min: 20, max: 100},
		               Deadline: vm.factor["Deadline"],
		               Location: vm.marker.position.toUrlValue(),
			       ResourceNum: {min: 2, max: 10},
			       ResourceCost: {min: 2, max: 10}
		             }

		  }).then(function success(response) {
			console.log(response.data);
		  });


		//receive facilities location from server and put markers on map
		//using fake data right now
		//wait back end implementation
		// vm.facilities = [];
		// vm.destinations  = [];
		// var facility1 = {lat: -34.4105585, lng: 150.8783824};
		// var facility2 = {lat: -34.4853985, lng: 150.872664};
		// vm.facilities.push(facility1);
		// vm.facilities.push(facility2);
		startLoc[0] = 'Sydney';
		startLoc[1] = 'Hyams Beach';
		endLoc = 'University of Wollongong';
		

		// for(var i = 0; i < endLoc.length; ++i){
		// 	facilitiesMarker[i] = new google.maps.Marker({
		// 		position: startLoc[i],
		// 		map: vm.map,
		// 		animation: google.maps.Animation.DROP
		// 	});
		// }
		
		//set the routes between startloc and endloc
//********************************
		receiveEventTask();
		searchCircle();
		setRoutes();
	} 

	vm.setDataField = function(){
		// generate factor
		vm.factorGenerate();

		$mdDialog.show(
			{
				templateUrl: "factorDialog.html",
				clickOutsideToClose: true,
		        scope: $scope,
		        preserveScope: true,
		        controller: function($scope) {
			}
		});
	};

	// reset factor
	vm.reset = function () {
		vm.factorGenerate();
	}

	// close dialog
	vm.close = function () {
    	$mdDialog.cancel();
  	}


  	vm.progrssMenuOpen = function () {
        ngDialog.open({ 
        	template: 'eventProgress.html',
        	overlay: false,
        	showClose: false,
        	scope: $scope,
        	className: 'ngdialog-theme-default progress-menu draggable'     	
        });


  		vm.stage = "Analysing Event";
  		$timeout(function() {
  			vm.eventShow = true;
  		}, 1500);
       
        $timeout(function() {
  			vm.stage = "Establishing Plan";
  		}, 3500);
		$timeout(function() {
  			vm.taskShow = true;
  		}, 5500);
        $timeout(function() {
  			vm.stage = "Searching for Facilities";
  		}, 7500);
    };


  	function createMarker(latlng, label, html) {
	    var marker = new google.maps.Marker({
	        position: latlng,
	        map: vm.map,
	        title: label,
	        zIndex: Math.round(latlng.lat()*-100000)<<5
	        });
	        marker.myname = label;

	    return marker;
	}  

	function searchCircle(){
		var _radius = 10000;
		var rMin = _radius * 4/5;
		var rMax = _radius;
		var direction = 1;

		var circleOption = {
			center: vm.marker.position,
			fillColor: '#3878c7',
			fillOpacity: 0.6,
			map: vm.map,
			radius: 10000,
			strokeColor: '#3878c7',
	        strokeOpacity: 1,
	        strokeWeight: 0.5
		}
		var circle = new google.maps.Circle(circleOption);

		var circleTimer = $interval(function(){
			var radius = circle.getRadius();
			if((radius > rMax) || (radius) < rMin){
				direction *= -1;
			}
			var _par = (radius/_radius) - 0.7;

			circleOption.radius = radius + direction * 10;
			circleOption.fillOpacity = 0.6 * _par;

			circle.setOptions(circleOption);
		}, 20);
	}

  	function setRoutes(){

  		var directionDisplay = new Array();

  		var rendererOptions = {
  			map: vm.map,
  			suppressMarkers : true,
  			preserveViewport: true
  		}

  		directionsService = new google.maps.DirectionsService();

  		var travelMode = google.maps.DirectionsTravelMode.DRIVING;
  		var requests = new Array();
  		// for(var i = 0; i < startLoc.length; ++i){
  		// 	requests[i] = {
  		// 		origin: startLoc[i],
  		// 		destination: endLoc,
  		// 		travelMode: travelMode
  		// 	};
  		// 	directionsService.route(requests[i], makeRouteCallback(i, directionDisplay[i]));
  		// }
  		var request = {
  			origin: startLoc[0],
  			destination: vm.marker.position,
  			travelMode: travelMode

  		}
  		directionsService.route(request, makeRouteCallback(0, directionDisplay[0]));
  		
  		function makeRouteCallback(routeNum, dip){
	  		if(polyline[routeNum] && (polyline[routeNum].getMap() != null)){
	  			startAnimation(routeNum);
	  			return;
	  		}
	  		return function(response, status){
	  			if(status == google.maps.DirectionsStatus.OK){

	  				var bounds = new google.maps.LatLngBounds();
	  				var route = response.routes[0];
	  				startLocation[routeNum] = new Object();
	  				endLocation[routeNum] = new Object();

	  				polyline[routeNum] = new google.maps.Polyline({
	  				path: [],
	            	strokeColor: '#FFFF00',
	            	strokeWeight: 3 
	            	});
	  				poly2[routeNum] = new google.maps.Polyline({
		            path: [],
		            strokeColor: '#FFFF00',
		            strokeWeight: 3
		            });    


	  				var path = response.routes[0].overview_path;
		            var legs = response.routes[0].legs;


		            disp = new google.maps.DirectionsRenderer(rendererOptions);     
		            disp.setMap(vm.map);
		            disp.setDirections(response);

		            //create resources markers
		            for (i = 0; i < legs.length; i++) {

		              if (i == 0) { 
		                startLocation[routeNum].latlng = legs[i].start_location;
		                startLocation[routeNum].address = legs[i].start_address;
		                // marker = google.maps.Marker({map:map,position: startLocation.latlng});
		                marker[routeNum] = createMarker(legs[i].start_location,"start",legs[i].start_address,"green");
		              }
		              endLocation[routeNum].latlng = legs[i].end_location;
		              endLocation[routeNum].address = legs[i].end_address;
		              var steps = legs[i].steps;

		              for (j = 0; j < steps.length; j++) {
		                var nextSegment = steps[j].path;                
		                var nextSegment = steps[j].path;

		                for (k = 0;k < nextSegment.length; k++) {

		                    polyline[routeNum].getPath().push(nextSegment[k]);
		                    //bounds.extend(nextSegment[k]);
		                }

		              }
	            	}
	            	
	  			}
	  			polyline[routeNum].setMap(vm.map);		         
			    //map.fitBounds(bounds);
		        startAnimation(routeNum); 

	  			
	  		}
  		}	
  	}

  	var eol = [];
  	var lastVertex = 1;
  	var stepnum=0;
    var step = 50; // 5; // metres
    var tick = 100; // milliseconds

  	function updatePoly(i,d) {
	 // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
	    if (poly2[i].getPath().getLength() > 20) {
	          poly2[i] = new google.maps.Polyline([polyline[i].getPath().getAt(lastVertex-1)]);
	          // map.addOverlay(poly2)
	        }

	    if (polyline[i].GetIndexAtDistance(d) < lastVertex + 2) {
	        if (poly2[i].getPath().getLength() > 1) {
	            poly2[i].getPath().removeAt(poly2[i].getPath().getLength() - 1)
	        }
	            poly2[i].getPath().insertAt(poly2[i].getPath().getLength(),polyline[i].GetPointAtDistance(d));
	    } else {
	        poly2[i].getPath().insertAt(poly2[i].getPath().getLength(),endLocation[i].latlng);
	    }
	 }
  	function animate(index,d) {
  		// console.log(index + " " + d);
	   	if (d > eol[index]) {
	      	marker[index].setPosition(endLocation[index].latlng);
	      	return;
	   	}
	    var p = polyline[index].GetPointAtDistance(d);
	    marker[index].setPosition(p);
	    updatePoly(index,d);
	    // timerHandle[index] = setTimeout("animate("+index+","+(d+step)+")", tick);
	    // timerHandle[index] =  $timeout(animate(index, (d + step)), tick);
	    timerHandle[index] =  $timeout(function() {
	    	animate(index, (d + step));
	    }, tick);

	}

  	function startAnimation(index){


  		// console.log("start marker animation");
  		// if(timerHandle[index])
  		// 	$timeout.cancel(timerHandle[index]);
  		eol[index] = polyline[index].Distance();

  		poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)],
  						strokeColor:"#FFFF00", strokeWeight:3});
  		$timeout(function() {
  			animate(index, 50);
  		}, 50);
  	}

	  	function receiveEventTask(){
      vm.services = [];
      //for loop to receive type of resources needed
        //push()
        vm.services =
        [{
          resource: 'Police car',
          number: 2
        },{
          resource: 'Ambulance',
          number: 3
        }];
        vm.totalResource = 0;
        for(var i = 0; i < vm.services.length; i++){
	        vm.totalResource += vm.services[i].number;
		}
      //end for loop
    }

});

app.controller('AppCtrl', function ($scope, $mdSidenav) {
    $scope.toggleLeft = buildToggler('left');
    $scope.toggleRight = buildToggler('right');

    function buildToggler(componentId) {
      return function() {
        $mdSidenav(componentId).toggle();
      };
    }
});


app.directive("showForm", function(){
	return {
		restrict: 'E',
		templateUrl: 'setDataForm.html'
	}
});

app.directive("showTag", function(){
	return{
		template: "<div><h1><button ng-click=vm.setDataField()>" + "Start simulation" + "</button></h1></div>"
		// template: "<p><p>"
	};
});

