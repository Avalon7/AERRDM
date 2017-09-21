app.controller('singleEventCtrl', function(NgMap, $q, $compile, $scope, $mdDialog, $http, $timeout, $interval, ngDialog, localStorageService, selectedFacility){

  //map initialization
  var singleVm = this;
  var directionDisplay;
  var directionsService;
  var stepDisplay;
  $scope.headerMes = "Single Event";


  var position;
  var marker = [];
  var facilityMarker = [];
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

  var iconBase = "./img/";
  var icons = {
    ambulance:{
      url: iconBase + "ambulance.svg"
    },
    fireTruck:{
      icon: iconBase + "firetruck.svg"
    },
    policeCar:{
      icon: iconBase + "police-car.svg"
    },
    hospital:{
      icon: iconBase + "hospital.svg"
    },
    fireStation:{
      icon: iconBase + "fire-station.svg"
    },
    policeStation:{
      icon: iconBase + "polica-station.svg"
    }
  };

  NgMap.getMap("map").then(function(map){
    singleVm.map = map;
    singleVm.map.setZoom(14);
  });

  function clearMapClickEvent(){
    //clear onclick event in map
    google.maps.event.clearListeners(singleVm.map, 'click');
  }

  singleVm.mapKeyUp = function($event){
    var onKeyUpResult = $event.keyCode;
    if(onKeyUpResult == 27)
      defaultCursor();
  }

  function defaultCursor() {
    clearMapClickEvent();
    singleVm.map.setOptions({draggableCursor:''});
  };

  // random location
  singleVm.randomLocation = function(){
    var place = ["UTS Library", "UNSW Art & Design", "Sydney Central Station", "Sydney Opera House"];
    var max = place.length-1;
    var min = 0;
    var index = Math.floor((Math.random()*(max-min+1))+min);

    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'address': place[index]}, function(results, status){
      singleVm.map.setCenter(results[0].geometry.location);
      singleVm.placeMarkerByRandomAndSearch(results[0].geometry.location)
    });
  }

  // enable user to click on the map to place marker
  singleVm.putMarker = function(){
    // change cursor to marker
    singleVm.map.setOptions({draggableCursor:'url(img/marker.svg), auto'});

    // add click event on map
    google.maps.event.addListener(singleVm.map, 'click', function(event){      
      singleVm.placeMarker(event);
    });
  }

  // current location
  singleVm.currentLocation = function(){
    navigator.geolocation.getCurrentPosition(function(position){
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      singleVm.map.setCenter(new google.maps.LatLng(pos.lat, pos.lng));
      console.log("processing");
      singleVm.placeMarkerCurrent(pos);
    });
  }

  // triggered when place changed
  singleVm.placeChanged = function(){
    singleVm.place = this.getPlace();
    singleVm.map.setCenter(singleVm.place.geometry.location);
    // singleVm.placeMarkerByRandomAndSearch(singleVm.place.geometry.location);
  }
  
  // place a marker of current location
  singleVm.placeMarkerCurrent = function(pos){
    if(singleVm.marker){
      singleVm.marker.setMap(null);
    }
    singleVm.marker = new google.maps.Marker({
      position: {lat: pos.lat, lng: pos.lng},
      map: singleVm.map,
      icon: "./img/marker.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    singleVm.markerElement();
  }

  //place a marker by clicking mouse
  singleVm.placeMarker = function(e){
    if(singleVm.marker){
      singleVm.marker.setMap(null);
    }
    singleVm.marker = new google.maps.Marker({
      position: e.latLng,
      map: singleVm.map,
      icon: "./img/marker.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    singleVm.markerElement();
  }

  //place a marker by random and search
  singleVm.placeMarkerByRandomAndSearch = function(loc){
    if(singleVm.marker){
      singleVm.marker.setMap(null);
    }
    singleVm.marker = new google.maps.Marker({
      position: loc,
      map: singleVm.map,
      icon: "./img/marker.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    singleVm.markerElement();
  }

  // add element to marker
  singleVm.markerElement = function(){
    //display the marker info
    singleVm.htmlElement = "  <div><div><p id=\"infoWin-header\">Single Event Setting</p></div> " + 
    "<div><button class=\"button continue-btn ripple\" ng-click=\"singleVm.setDataField()\">" + "Set event data" + "</button></div></div>"
    // var htmlElement = "<showTag></showTag>"
    //need to compile 

    singleVm.compiled = $compile(singleVm.htmlElement)($scope)
    singleVm.marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: singleVm.compiled[0]

    });
    //show the infomation window
    singleVm.marker.addListener('click', function($scope){
      singleVm.marker.infoWin.open(singleVm.map, singleVm.marker);
    });

    //set info windows
    singleVm.lastOpenedInfoWindow = singleVm.marker.infoWin;

  }

  singleVm.closeInfoWin = function(){
    if (singleVm.lastOpenedInfoWindow) {
          singleVm.lastOpenedInfoWindow.close();
      }
  }
  
  singleVm.callFunction = function(name){
    if(angular.isFunction(singleVm[name]))
      singleVm[name]()
  }


  singleVm.infoWinRedirect = function(toFunction){
    // remove last compile element object
    singleVm.compiled.remove();
    // get function name 
    singleVm.to_function = toFunction;
    singleVm.htmlElement = "  <div><div><p id=\"infoWin-header\">Event information</p></div> " + 
    "<div><button class=\"button continue-btn ripple\" ng-click=\"singleVm.callFunction(singleVm.to_function)\">" + "View progress" + "</button></div></div>"
    // var htmlElement = "<showTag></showTag>"
    //need to compile 
    singleVm.compiled = $compile(singleVm.htmlElement)($scope)
    singleVm.marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: singleVm.compiled[0]
    });
  }

  singleVm.category_list = ["Medical Help", "Urban Fire", "Chemical Leakage"];

  singleVm.levelGenerator = function(){
    return Math.floor((Math.random()*5)+1);
  }
  singleVm.categoryGenerator = function(){
    var size = singleVm.category_list.length;
    return Math.floor((Math.random()*size));
  }
  singleVm.expenditureGenerator = function(){
    var max = 200; 
    var min = 0;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.velocityGenerator = function(){
    var max = 100;
    var min = 20;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.deadlineGenerator = function(){
    var max = 15;
    var min = 5;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  singleVm.minExpenditureGenerator = function(){
    var max = 100; 
    var min = 0;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.maxExpenditureGenerator = function(){
    var max = 200;
    var min = 101;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  singleVm.minVelocityGenerator = function(){
    var max = 60; 
    var min = 20;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.maxVelocityGenerator = function(){
    var max = 100;
    var min = 61;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  singleVm.factorGenerate = function(){
    singleVm.level = singleVm.levelGenerator();
    singleVm.category = singleVm.categoryGenerator();
    singleVm.expenditure = singleVm.expenditureGenerator();
    singleVm.minExpenditure = singleVm.minExpenditureGenerator();
    singleVm.maxExpenditure = singleVm.maxExpenditureGenerator();
    singleVm.velocity = singleVm.velocityGenerator();
    singleVm.minvelocity = singleVm.minVelocityGenerator();
    singleVm.maxvelocity = singleVm.maxVelocityGenerator();
    singleVm.deadline = singleVm.deadlineGenerator();

    //Auto increment

    singleVm.eId = 001;

    singleVm.factor = {
      'ID': singleVm.eId,
      'Severity Level': singleVm.level,
      'Category': singleVm.category_list[singleVm.category],
      'Resource avg. expenditure': singleVm.expenditure,
      'Min expenditure': singleVm.minExpenditure,
      'Max expenditure': singleVm.maxExpenditure,
      'Min velocity': singleVm.minvelocity,
      'Max velocity': singleVm.maxvelocity,
      'Resource avg. velocity': singleVm.velocity,
      'Deadline': singleVm.deadline,
      'Location': singleVm.marker.position.toUrlValue()
      }
    }

    singleVm.progrssMenuOpen = function () {
      ngDialog.open({ 
        template: 'eventProgress.html',
        overlay: false,
        showClose: false,
        scope: $scope,
        className: 'ngdialog-theme-default progress-menu draggable'       
      });
    };

  // now start the simulation
  singleVm.startSingleEvent = function(){
    // close factor menu
    var progressStage = 0;
    $mdDialog.hide();
    // close info window
    singleVm.closeInfoWin();
    //clear onclick event in map
    clearMapClickEvent();

    defaultCursor();

    progressInfoControl(0);

    // open progress menu
    progrssMenuOpen();
    // redirect info window to progress menu
    singleVm.infoWinRedirect("progrssMenuOpen");

    singleVm.map.setCenter(singleVm.marker.position);

    //search 
    searchCircle();

    //two http request chainning together
    //first $http get all facility location and display
    //second $http request filter the facilities remove the unused facilities location
    // displayTask = function () {
    //   singleVm.getFaciLoc().then(getTasks);
    // }
    singleVm.getFaciLoc();

    //hard code start location
    startLoc[0] = 'Sydney';
    startLoc[1] = 'Moore Park';
    startLoc[2] = 'The university of sydney';

    setRoutes();
    // searchCircle();


    singleVm.panelShow = "true";
  } 


  singleVm.getFaciLoc = function(){
    $http({

      method  : 'POST',
      url     : '/singleEvent',
      //     // set the headers so angular passing info as form data (not request payload)
      headers : { 'Content-Type': 'application/json' },
      data    : {
                 Severity: singleVm.factor["Severity Level"],
                 Category: singleVm.factor["Category"],
                 Expenditure: {min: singleVm.factor['Min expenditure'], max: singleVm.factor['Max expenditure']},
                 Velocity: {min: singleVm.factor['Min velocity'], max: singleVm.factor['Max velocity']},
                 Deadline: singleVm.factor["Deadline"],
                 Location: singleVm.marker.position.toUrlValue(),
                 ResourceNum: {min: 2, max: 10}
                }

      }).then(function success(response) {
        // console.log(response.data);
          for(var i = 0; i < response.data.facilities.length; ++i){
            if(response.data.facilities[i].type == "hospital")
              putHospital(response.data.facilities[i]);
            else if(response.data.facilities[i].type == "police")
              putPolice(response.data.facilities[i]);
            else if(response.data.facilities[i].type == "fire_station")
              putFire(response.data.facilities[i]);

          // return response.data;
          getTasks(response.data);
        }

      });
  }

  getTasks = function(dataObj){
    $http({

      method  : 'POST',
      url     : '/assignResource',
      headers : { 'Content-Type': 'application/json' },
      data    : {
                  sim_id: dataObj.sim_id
      }
    }).then(function success(response){
        console.log(response.data);
    })
  }

  singleVm.setDataField = function(){
    // generate factor
    singleVm.factorGenerate();

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
  singleVm.reset = function () {
    singleVm.factorGenerate();
  }

  // close dialog
  singleVm.close = function () {
      $mdDialog.cancel();
    }


    var totalProgressStage = 6;
    var currentProgressStage = 0;
    var progressHandle = [];
    // var delayArray = [0, 1500, 3500, 5500, 7500, 7600, 8100];
    var delayArray = [0, 1500, 2000, 1500, 2000, 100, 500];


    function progressInfoControl(stage){
      // currentProgressStage = stage;
      if(stage > delayArray.length){
        return;
      }
      if(stage == 0){
        singleVm.stage = "Analysing Event";
      }
      else if(stage == 1){
        singleVm.eventShow = true;
      }
      else if(stage == 2){
      singleVm.stage = "Establishing Plan";
      }
      else if(stage == 3){
        singleVm.taskShow = true;
      }
      else if(stage == 4){
        singleVm.stage = "Searching for Facilities";
      }
      else if(stage == 5){
        singleVm.containerExtend = 'progress-extend';
        singleVm.contentExtend = 'progress-content-extend';
      }
      else if(stage == 6){
        singleVm.radarShow = true;
      }


      stage++;
      currentProgressStage = stage;
      progressHandle[stage] = $timeout(function(){
        progressInfoControl(stage);
      }, delayArray[stage]);

    }

    singleVm.searchExtend = function(){
      defaultCursor();
      singleVm.searchBoxExtend = "";
      if(!singleVm.searchShow){
        singleVm.searchBoxExtend = "animated fadeIn";
        singleVm.searchShow = true;
      }
      else{
        singleVm.searchBoxExtend = "animated fadeOut ";
        singleVm.searchShow = false;
      }
    }

    function progrssMenuOpen(){
      var dialog = ngDialog.open({ 

          template: 'eventProgress.html',
          overlay: false,
          showClose: false,
          scope: $scope,
          className: 'ngdialog-theme-default progress-menu draggable'       
        });
    };


    function createMarker(latlng, label, html) {
      var marker = new google.maps.Marker({
          position: latlng,
          map: singleVm.map,
          title: label,
          // zIndex: Math.round(latlng.lat()*-100000)<<5,
          icon: "./img/police-car.svg",
          animation: google.maps.Animation.DROP
          });
          marker.myname = label;

      return marker;
  }  

  function putPolice(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      title: label,
      icon: "./img/police-station.svg",
      animation: google.maps.Animation.DROP
    })

    var facilityElement = facilitiesInfo(facilityObj, "police");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });

    // return marker;
  }

  function putHospital(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      title: label,
      icon: "./img/hospital.svg",
      animation: google.maps.Animation.DROP
    })

    var facilityElement = facilitiesInfo(facilityObj, "hospital");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });

    // return marker;
  }

  function putFire(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      title: label,
      icon: "./img/fire-station.svg",
      animation: google.maps.Animation.DROP
    })

    var facilityElement = facilitiesInfo(facilityObj, "fire_station");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });

    // return marker;
  }

  function resourcesNumberGenerate(num){
    return new Array (num);
  }

  function facilitiesInfo(facilityObj, facility_type){
    var type = "";
    if(facility_type == "police")
      type = "Police Car";
    else if(facility_type == "hospital")
      type = "Ambulance";
    else if(facility_type == "fire_station")
      type = "Fire Truck";

    var max = 6;
    var min = 4;
    var number = Math.floor(Math.random() * (max - min + 1)) + min;
    // console.log(number);
    singleVm.number = resourcesNumberGenerate(number);

    var facility_name = facilityObj.name;
    var element =   "<div>"+
              "<div class=\"infoWin-header-container\">"+
                "<p id=\"infoWin-header\" class=\"facility-header\">Location</p>"+"<span class=\"facility-name\">"+facility_name+"</span>"+
              "</div> " + 
              "<div>" +
                "<div id=\"facility-info-container\">"+
                      "<table id=\"resource-info-table\">"+
                        "<tr>"+
                          "<th colspan=\"2\" class=\"recourse-header\">Mobile Resources Information</th>"+
                        "</tr>"+
                        "<tr>"+
                          "<th class=\"sub-header\">ID</th>"+
                          "<th class=\"sub-header\">Type</th>"+
                        "</tr>"+
                        "<tr ng-repeat=\"i in singleVm.number track by $index\">"+
                          "<td class=\"\">{{$index + 1}}</td>"+
                          "<td class=\"\">"+type+"</td>"+
                        "</tr>"+
                      "</table>"+
                    "</div>"+
              "</div>"+
            "</div>"

    return element;
  }

  function searchCircle(){
    var _radius = 10000;
    var rMin = _radius * 4/5;
    var rMax = _radius;
    var direction = 1;

    var circleOption = {
      center: singleVm.marker.position,
      fillColor: '#3878c7',
      fillOpacity: 0.6,
      map: singleVm.map,

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
      var startLocLength;
      
      var rendererOptions = {
        map: singleVm.map,
        suppressMarkers : true,
        preserveViewport: true
      }

      directionsService = new google.maps.DirectionsService();

      var travelMode = google.maps.DirectionsTravelMode.DRIVING;
      var requests = new Array();
      for(var i = 0; i < startLoc.length; ++i){
        requests[i] = {
          origin: startLoc[i],
          destination: singleVm.marker.position,
          travelMode: travelMode
        };
        directionsService.route(requests[i], makeRouteCallback(i, directionDisplay[i]));
      }

      
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
                disp.setMap(singleVm.map);

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
          polyline[routeNum].setMap(singleVm.map);             

          //map.fitBounds(bounds);
            startAnimation(routeNum);           
        }
      } 
    }

    var eol = [];
    var lastVertex = 1;
    var stepnum=0;
    var maxStep = 5; // max distance per move
    singleVm.step = 0.1; // 3; // metres
    var playStop = true; // true = play, false = stop

    var tick = 100; // milliseconds

    var current_index = 0;
    var current_point = [];

    var markerStarted = false;

    singleVm.stepControl = function(step){
      singleVm.step = singleVm.step + step;
      if(singleVm.step > maxStep){
        singleVm.step = maxStep;
      }
      else if(singleVm.step < 0.1){
        singleVm.step = 0.1;
      }
    }

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


  // stop simulation
  singleVm.stopTimeout = function(){
    //reset map
    //clear current event
    console.log("Stop simulation and redraw the map");

    NgMap.getMap("map").then(function(){
      google.maps.event.trigger(singleVm, 'resize');

    });
  }

  // pause simulation
  singleVm.pauseTimeout = function(){
    if(playStop){
      // console.log(currentProgressStage);
      playStop = false;
      // if marker started
      if(markerStarted){
        for(var i = 0; i < startLoc.length; i++){
          $timeout.cancel(timerHandle[i]);
          console.log("Pause" + i);
        }
      }
      // pause progress menu
      $timeout.cancel(progressHandle[currentProgressStage]);
      singleVm.pause = "pause-effect";
      singleVm.pauseIcon = true;
    }
  }

  // play simulation after paused
  singleVm.restartTimeout = function(){
    if(!playStop){
      playStop = true;
      if(markerStarted){
        // need to fix bug
        timerHandle[0] = $timeout(function() {
            animate(0, (current_point + singleVm.step*5));
          }, tick);
          timerHandle[1] = $timeout(function() {
            animate(1, (current_point + singleVm.step*5));
          }, tick);
      }

      singleVm.pause = "";
        progressHandle[currentProgressStage] = $timeout(function(){
          progressInfoControl(currentProgressStage);
        }, delayArray[currentProgressStage]);
        singleVm.pauseIcon = false;
    }
  }

    function animate(index,d) {
      markerStarted = true;
      current_point = d;
      if (d > eol[index]) {
          marker[index].setPosition(endLocation[index].latlng);
          return;
      }
      var p = polyline[index].GetPointAtDistance(d);
      marker[index].setPosition(p);
      updatePoly(index,d);
      timerHandle[index] =  $timeout(function() {
        animate(index, (d + singleVm.step*5));
      }, tick);
  }

    function startAnimation(index){

      eol[index] = polyline[index].Distance();

      poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});
    }

    function receiveEventTask(){

      singleVm.services = [];
      //for loop to receive type of resources needed
       //push()
        singleVm.services =

        [{
          resource: 'Police car',
          number: 2
        },{
          resource: 'Ambulance',
          number: 3
        }];
        singleVm.totalResource = 0;
        for(var i = 0; i < singleVm.services.length; i++){
          singleVm.totalResource += singleVm.services[i].number;
    }


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
    template: "<div><h1><button ng-click=singleVm.setDataField()>" + "Start simulation" + "</button></h1></div>"
    // template: "<p><p>"
  };
});

