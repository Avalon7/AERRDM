app.controller('singleEventCtrl', function(NgMap, $q, $compile, $scope, $rootScope, $route, $mdDialog, $http, $timeout, $interval, ngDialog, localStorageService, $window, facilitySelected){

  //map initialization
  var singleVm = this;
  var directionDisplay;
  var directionsService;
  var stepDisplay;
  $scope.headerMes = "Single Event";

  singleVm.eventStarted = false;
  singleVm.eventIsSet = false;
  singleVm.hamCheck = true;
  singleVm.isReset = false;

  var socket = io();
 
  socket.on('sim update', function(msg){
   // console.log(msg);
   // console.log(msg.includes("Plan is now available"));
   if(msg.includes("Plan is now available")){
      console.log("getting plan");
      var msgSplit = msg.split(",");
      getTasks(msgSplit[1]);
   }
   else if(msg == "expend"){
      //expend sear
      console.log("expending searching area");
   }
   else{
      console.log("loop");
   }
  });


  var position;
  var marker = [];
  var facilityMarker = [];
  var polyline = [];
  var poly2 = [];
  var poly = null;
  var timerHandle = [];
  var startLoc = new Array();
  var facilitiesMarker = new Array();
  var endLoc = [];
  var mailMarker = [];
  var polylines = [];
  var requestMarkers = [];
  singleVm.requestMarkers = [];
  singleVm.finalPlanMarker = [];
  singleVm.sendMessageLine = [];
  singleVm.messageLine = [];
  singleVm.sendFinalLine = [];
  singleVm.finalLine = [];
  singleVm.distinctFac = [];
  singleVm.totalInvolved = 0;
  singleVm.agentMarker = [];
  singleVm.facMarker = [];

  singleVm.agentNum = 0;
  var count = 0;
  var startLocation = new Array();
  var endLocation = new Array();

  var speed = 0.000005, wait = 1;
  var infowindow = null;
  var facilityObj;
  var statObj;
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
      icon: iconBase + "police-station.svg"
    }
  };

  NgMap.getMap("map").then(function(map){
    singleVm.map = map;
    singleVm.map.setZoom(3);
    // show search box as defualt
    singleVm.searchExtend();
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

    var place = ["UTS Library", "UNSW Art & Design", "Sydney Central Station", "Sydney Opera House", "Moonlight Ciinema Sydney", "Jubilee Park", "Woolahra", "Kensington"];
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
    if(!singleVm.eventStarted){
      // change cursor to marker
      singleVm.map.setOptions({draggableCursor:'url(img/placeholder.svg), auto'});

      // add click event on map
      google.maps.event.addListener(singleVm.map, 'click', function(event){      
        singleVm.placeMarker(event);
      });
    }
  }

  // current location
  singleVm.currentLocation = function(){
    if(!singleVm.eventStarted){
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
  }

  // triggered when place changed
  singleVm.placeChanged = function(){
    if(!singleVm.eventStarted){
      singleVm.place = this.getPlace();
      singleVm.map.setCenter(singleVm.place.geometry.location);
      singleVm.placeMarkerByRandomAndSearch(singleVm.place.geometry.location);
    }
  }
  
  // place a marker of current location
  singleVm.placeMarkerCurrent = function(pos){
    if(singleVm.marker){
      singleVm.marker.setMap(null);
    }
    singleVm.marker = new google.maps.Marker({
      position: {lat: pos.lat, lng: pos.lng},
      map: singleVm.map,
      icon: "./img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });
    singleVm.map.setZoom(14);

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
      icon: "./img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });
    singleVm.map.setZoom(14);
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
      icon: "./img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });
    singleVm.map.setZoom(14);

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
      defaultCursor();
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
    var max = singleVm.maxExpenditure; 
    var min = singleVm.minExpenditure;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.velocityGenerator = function(){
    var max = singleVm.maxvelocity;
    var min = singleVm.minvelocity;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  singleVm.deadlineGenerator = function(){
    var max = 120;
    var min = 40;
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
    // if event is set
    if(singleVm.eventIsSet){
      if(!singleVm.isReset)
        return;
    }
    singleVm.isReset = false;
    singleVm.level = singleVm.levelGenerator();
    singleVm.category = singleVm.categoryGenerator();
    singleVm.minExpenditure = singleVm.minExpenditureGenerator();
    singleVm.maxExpenditure = singleVm.maxExpenditureGenerator();
    singleVm.expenditure = singleVm.expenditureGenerator(); 
    singleVm.minvelocity = singleVm.minVelocityGenerator();
    singleVm.maxvelocity = singleVm.maxVelocityGenerator();
    singleVm.velocity = singleVm.velocityGenerator();
    singleVm.deadline = singleVm.deadlineGenerator();
    singleVm.minResource = 2;
    singleVm.maxResoruce = 10;
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
      'Min resource': singleVm.minResource,
      'Max resource': singleVm.maxResoruce,
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


  singleVm.eventSet = function(){
    $mdDialog.hide();
    singleVm.closeInfoWin();
    singleVm.startShow = true;
    singleVm.eventIsSet = true;
  }
  // now start the simulation

  singleVm.startSingleEvent = function(){
    singleVm.closeInfoWin();
    // close factor menu
    singleVm.eventStarted = true;
    // hide start button
    singleVm.eventStartHide = "slideOutDown";
    // set marker undraggable when event started
    singleVm.marker.setDraggable(false);

    var progressStage = 0;
    $mdDialog.hide();
    // close hamburger menu
    singleVm.hamCheck = false;
    // hide search box
    singleVm.searchExtend();
    // clear onclick event in map
    clearMapClickEvent();
    // change back to default google map cursor
    defaultCursor();
    // start progress menu animation
    progressInfoControl(0);
    // open progress menu
    singleVm.progrssMenuOpen();
    // redirect info window to progress menu
    singleVm.infoWinRedirect("progrssMenuOpen");

    singleVm.map.setCenter(singleVm.marker.position);

    window.localStorage['eventStatis'] = JSON.stringify(singleVm.factor);
    
    singleVm.getFaciLoc()
    .then(putFacMarker)
    .then(function(){
      return $timeout(100)
    })
    .then($timeout(sendReqtToFac, 20000))
    .then($timeout(receiveResponseFromFac, 28000))
    .then($timeout(sendFinalToFac, 45000))
    .then($timeout(getStat, 29000))
    .then($timeout(checkPlan, 10000));

    singleVm.panelShow = "true";
  } 


  singleVm.getFaciLoc = function(){
    console.log("getFaciLoc");
    return $http({

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
                 Location: {lat: singleVm.marker.position.lat(), lng: singleVm.marker.position.lng()},
                 ResourceNum: {min: singleVm.factor['Min resource'], max: singleVm.factor['Max resource']}
                }

      }).then(function success(response) {

        console.log(response.data);
        facilityObj = response.data;
        window.localStorage['simulationStatis'] = JSON.stringify(response);
        
        var totalFacilites = 0;
        var totalPoliceStation = 0;
        var totalHospital = 0;
        var totalFireStation = 0;
        var ambulanceNum = 0;
        var policeCarNum = 0;
        var fireTruckNum = 0;


        for(var i = 0; i < response.data.facilities.length; ++i){
          totalFacilites++;
          if(response.data.facilities[i].type == "hospital"){
            ambulanceNum = response.data.resources.hospital.num;
            totalHospital++;
          }
          else if(response.data.facilities[i].type == "police"){
            policeCarNum = response.data.resources.police.num;
            totalPoliceStation++;
          }
          else if(response.data.facilities[i].type == "fire_station"){
            fireTruckNum = response.data.resources.fire_station.num;
            totalFireStation++;
          }
        }
        receiveEventTask(ambulanceNum, policeCarNum, fireTruckNum);
        singleVm.facilitesSummary(totalFacilites, totalHospital, totalPoliceStation, totalFireStation);

        return response.data;

      });
  }

  putFacMarker = function(dataObj){
    // console.log("put facility marker");
    console.log(dataObj);
      var defer = $q.defer();
      $timeout(function(){
          // sendReqtToFac(response.data);
            var index = 0;
          for(var i = 0; i < dataObj.facilities.length; ++i){
            if(dataObj.facilities[i].type == "hospital"){
              putHospital(dataObj.facilities[i]);
            }
            else if(dataObj.facilities[i].type == "police"){
              putPolice(dataObj.facilities[i]);
            }
            else if(dataObj.facilities[i].type == "fire_station"){
              putFire(dataObj.facilities[i]);
            }
          }
        }, 13000)
      defer.resolve("resolved");
      return defer.promise;
  }

  receiveResponseFromFac = function(){
    console.log("put message marker");

    for(var i = 0; i < singleVm.sendMessageLine.length; i++){
      singleVm.sendMessageLine[i].setMap(null);
    }

    var defer = $q.defer();
    console.log(facilityObj);
      for(var i = 0; i < facilityObj.facilities.length; ++i){
        endLoc = singleVm.marker.position;
        singleVm.sendMessageLine[i] = new google.maps.Polyline({
          path: [facilityObj.facilities[i].location, singleVm.marker.position],

          geodestic: true,
          strokeColor: '#00ace6',
          strokeOpacity: 0.6,
          strokeWeight: 2
        });

          singleVm.requestMarkers[i] = new google.maps.Marker({
            position: facilityObj.facilities[i].location,
            map: singleVm.map,
            icon: "img/mess.svg"
            // animation: google.maps.Animation.BOUNCE
        });
      }
    moveReceiveMarker(endLoc, polyline);
    defer.resolve("resolved");
    return defer.promise;
  }

  moveReceiveMarker = function(endLoc, polyline){
    var eol = [];
    // var poly2 = [];
    var timerHandle = [];
    for (var i = 0; i < singleVm.sendMessageLine.length; i++) {
        // console.log(i);
        singleVm.messageLine[i] = new google.maps.Polyline({
            path: []
        });
        singleVm.sendMessageLine[i].setMap(singleVm.map);
        singleVm.requestMarkers[i].setMap(singleVm.map);
        // console.log(singleVm.requestMarkers[i]);
        startReceiveAnimation(i);
    }
  }

  sendFinalToFac = function(){

    for(var i = 0; i < singleVm.sendMessageLine.length; i++){
      singleVm.sendMessageLine[i].setMap(null);
    }

    var defer = $q.defer();
    console.log(singleVm.distinctFac);
    for(var i = 0; i < singleVm.distinctFac.length; ++i){
      // console.log(facilityObj.facilities[i].location);

      endLoc[i] = singleVm.distinctFac[i].Location;
      singleVm.sendFinalLine[i] = new google.maps.Polyline({
        path: [singleVm.marker.position, singleVm.distinctFac[i].Location],

        geodestic: true,
        strokeColor: '#00ace6',
        strokeOpacity: 0.6,
        strokeWeight: 2
      });

        singleVm.finalPlanMarker[i] = new google.maps.Marker({
          position: singleVm.marker.position,
          map: singleVm.map,
          icon: "img/tactics.svg"
          // animation: google.maps.Animation.BOUNCE
      });
    }
    for(var i = 0; i < singleVm.agentNum - 1; ++i){
      singleVm.agentMarker[i].setMap(null);
    }

    defer.resolve("resolved");
    moveFinalMarker(endLoc, polyline);
    return defer.promise;
  }

  moveFinalMarker = function(endLoc, polyline){
    var eol = [];
    // var poly2 = [];
    var timerHandle = [];
    for (var i = 0; i < singleVm.sendFinalLine.length; i++) {
        // console.log(i);
        singleVm.messageLine[i] = new google.maps.Polyline({
            path: []
        });
        singleVm.sendFinalLine[i].setMap(singleVm.map);
        singleVm.finalPlanMarker[i].setMap(singleVm.map);
        // console.log(singleVm.requestMarkers[i]);
        startSendFinalAnimation(i);
    }
  }

  function finalPlanAnimate(index,d) {
      markerStarted = true;
      current_point = d;
      if (d > eol[index]) {
          singleVm.finalPlanMarker[index].setPosition(endLoc[index].latlng);
          // console.log("End of animation");
          return;
      }
      var p = singleVm.sendFinalLine[index].GetPointAtDistance(d);
      singleVm.finalPlanMarker[index].setPosition(p);
      updateRequestPoly(index,d);
      timerHandle[index] =  $timeout(function() {
        finalPlanAnimate(index, (d + 100));
      }, tick);
  }

  function startSendFinalAnimation(index){

      eol[index] = singleVm.sendFinalLine[index].Distance();

      singleVm.finalLine[index] = new google.maps.Polyline({path: [singleVm.sendFinalLine[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});

      finalPlanAnimate(index, 50);
    }

  sendReqtToFac = function(){
    console.log("put message marker");
    var defer = $q.defer();
    console.log(facilityObj);
      for(var i = 0; i < facilityObj.facilities.length; ++i){
        // console.log(facilityObj.facilities[i].location);

        endLoc[i] = facilityObj.facilities[i].location;
        singleVm.sendMessageLine[i] = new google.maps.Polyline({
          path: [singleVm.marker.position, facilityObj.facilities[i].location],

          geodestic: true,
          strokeColor: '#00ace6',
          strokeOpacity: 0.6,
          strokeWeight: 2
        });

          singleVm.requestMarkers[i] = new google.maps.Marker({
            position: singleVm.marker.position,
            map: singleVm.map,
            icon: "img/mess.svg"
            // animation: google.maps.Animation.BOUNCE
        });
      }
    defer.resolve("resolved");
    moveReqMarker(endLoc, polyline);
    return defer.promise;
  }

  moveReqMarker = function(endLoc, polyline){
    var eol = [];
    // var poly2 = [];
    var timerHandle = [];
    for (var i = 0; i < singleVm.sendMessageLine.length; i++) {
        // console.log(i);
        singleVm.messageLine[i] = new google.maps.Polyline({
            path: []
        });
        singleVm.sendMessageLine[i].setMap(singleVm.map);
        singleVm.requestMarkers[i].setMap(singleVm.map);
        // console.log(singleVm.requestMarkers[i]);
        startRequestAnimation(i);
    }
  }


  checkPlan = function(){
    console.log("checkPlan");
    $http({

      method  : 'POST',
      url     : '/singleEvent/assignResource',
      headers : { 'Content-Type': 'application/json' },
      data    : {
                  sim_id: facilityObj.sim_id
      }
    }).then(function success(response){
        // console.log(response.data);
        if(response.data === "Unable to generate plan"){
            ngDialog.openConfirm({
              template:'\
                <div>\
                  <div class="modal-header safari_top_radius">\
                    <div id="progress-title-content">\
                      <div class="icon-container">\
                        <span id="progress-title-icon"></span>\
                      </div>\
                      <span class="progress-title">Confirmation</span>\
                    </div>  \
                  </div>\
                  <div id="confirm-content">\
                    <p>Unable to generate a plan, simulation will stop</p>\
                    <div class="ngdialog-buttons modal-footer ">\
                        <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Restart</button>\
                    </div>\
                  </div>\
                </div>',
              plain: true,
              showClose: false,
              className: 'ngdialog-theme-default confirm-menu-container'
          }).then(function(value){
            $window.location.reload();
          });
          
        }
    })
  }

  getTasks = function(dataObj){
    // console.log("Sim_id: " + dataObj);
    console.log("getTasks");
    return $http({

      method  : 'POST',
      url     : '/singleEvent/GetPlan',
      headers : { 'Content-Type': 'application/json' },
      data    : {
                  sim_id: dataObj
      }
    }).then(function success(response){
        console.log(response.data);

        var keys = [];

        singleVm.resourcesNum = response.data.length;
        for(var i = 0; i < response.data.length; ++i){
          // startLoc.push(response.data[i].Location);
          if(startLoc.indexOf(response.data[i]) ==  -1){
            startLoc.push(response.data[i]);
            // console.log(response.data[i]);
          }

        }
        // get distinct facility
        angular.forEach(startLoc, function(item){
          var key = item['Facility'];
          if(keys.indexOf(key) === -1){
            keys.push(key);
            singleVm.distinctFac.push(item);
          }
        });

        singleVm.totalInvolved = singleVm.distinctFac.length;
        


        $rootScope.$emit("CallParentMethod", {});
        singleVm.resourceAllocation(response.data);
        facilitySelected.setFacility(response.data);

        window.localStorage['selectedFacility'] = angular.toJson(response.data);
        var eventLoc = {lat: singleVm.marker.position.lat(), lng: singleVm.marker.position.lng()};
        window.localStorage['eventLocation'] = JSON.stringify(eventLoc);


        // progressHandle[stage] = $timeout(function(){
      // progressInfoControl(stage);
    // }, delayArray[stage]);

        $timeout(function(){
          setRoutes()}, 45000);
    })
  }

  function receiveEventTask(ambulanceNum, policeCarNum, fireTruckNum){
    singleVm.totalResources = ambulanceNum+policeCarNum+fireTruckNum;
    singleVm.ambulance = ambulanceNum;
    singleVm.police = policeCarNum;
    singleVm.fireTruck = fireTruckNum;
  }

  singleVm.resourceAllocation = function(resourceObj){
    singleVm.allocatedResources = [];
    singleVm.avgVelocity = 0;
    singleVm.avgExpenditure = 0;
    singleVm.resourceSent = 0;



    for(var i = 0; i < resourceObj.length; i++){
      var type = " ";
      if(resourceObj[i].Type == "fire_station")
        type = "Fire Truck";
      else if(resourceObj[i].Type == "hospital")
        type = "Ambulance";
      else if(resourceObj[i].Type == "police")
        type = "Police Car";


      singleVm.allocatedResources[i] = {
        Type: type,
        Expenditure: resourceObj[i].Expenditure,
        Duration: resourceObj[i].Duration.toFixed(2),
        Distance: resourceObj[i].Distance.toFixed(2),
        Facility: resourceObj[i].Facility,
      };

      singleVm.avgExpenditure += resourceObj[i].Expenditure;
      singleVm.avgVelocity += resourceObj[i].Velocity;
    }
    // console.log(singleVm.avgExpenditure);

    singleVm.avgExpenditure /= resourceObj.length;
    singleVm.avgVelocity /= resourceObj.length;
    // console.log(singleVm.avgExpenditure);
    // console.log(singleVm.avgVelocity);

    window.localStorage['allocatedResource'] = JSON.stringify(singleVm.allocatedResources);
    // console.log(singleVm.allocatedResources);
  }

  singleVm.taskSummary = function(){

  }

  singleVm.facilitesSummary = function(totalFacilites, totalHospital, totalPoliceStation, totalFireStation) {
    singleVm.facilitiesSum = {
      'Total': totalFacilites,
      'Hospital': totalHospital,
      'Polication Station': totalPoliceStation,
      'Fire Station': totalFireStation
    }
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
    singleVm.isReset = true;
    singleVm.factorGenerate();
  }

  // close dialog
  singleVm.close = function () {
    $mdDialog.cancel();
  }

  var currentProgressStage = 0;
  var progressHandle = [];
  // var delayArray = [0, 1500, 3500, 5500, 7500, 7600, 8100];

  var delayArray = [0, 2000, 3000, 1900, 1700, 100, 500, 5500, 2500, 1000, 8000, 8000, 1500, 5500, 9700 ,5500 ,1000, 2000];


  function progressInfoControl(stage){
    currentProgressStage = stage;
    if(stage > delayArray.length){
      return;
    }
    if(stage == 0){
      // singleVm.stageIcon = "<i class=\"fa fa-search\" aria-hidden=\"true\"></i>";
      singleVm.stageIcon = "fa fa-search fa-lg";
      singleVm.stage = "Analysing Event";
    }
    else if(stage == 1){
      singleVm.eventShow = true;
    }
    else if(stage == 2){
      singleVm.stageIcon = "fa fa-server fa-lg";
      singleVm.stage = "Establishing Task";
    }
    else if(stage == 3){
      singleVm.taskShow = true;
    }
    else if(stage == 4){
      searchCircle();
      singleVm.stageIcon = "fa fa-eye fa-lg";
      singleVm.stage = "Searching for Facilities";
    }
    else if(stage == 5){
      singleVm.containerExtend = 'progress-first-extend';
      singleVm.contentExtend = 'progress-content-extend';
    }
    else if(stage == 6){
      singleVm.radarShow = true;
    }
    else if(stage == 7){
      singleVm.containerExtend = 'progress-second-extend';
      singleVm.facilityShow = true;
    }
    else if(stage == 8){
      singleVm.radarShow = false;
    }
    else if(stage == 9){
      singleVm.stageIcon = "fa fa-envelope fa-lg";
      singleVm.stage = "Sending Tasks Info to Facilities";
      singleVm.dotShow = true;
    }
    else if(stage == 10){
      singleVm.stageIcon = "fa fa-envelope-o fa-lg";
      singleVm.stage = "Receiving Response from Facilities";
    }
    else if(stage == 11){
      singleVm.dotShow = false;
    }
    else if(stage == 12){
      singleVm.stageIcon = "fa fa-envelope-open-o fa-lg";
      singleVm.spinDowShow = true;
      singleVm.stage = "Analysing Response from Facilities";
    }
    else if(stage == 13){
      singleVm.spinDowShow = false;
      singleVm.stageIcon = "fa fa-envelope fa-lg";
      singleVm.sendTaskShow = true;
      singleVm.stage = "Sending Final Plan to Facilities";
    }
    else if(stage == 14){
      singleVm.stageIcon = "fa fa-play-circle-o fa-lg";
      singleVm.sendTaskShow = false;
      singleVm.dotShow = true;
      singleVm.stage = "Facilities Execute Final Plan";
    }
    else if(stage == 15){
      singleVm.stage = "Resources Allocaton";
    }
    else if(stage == 16){
      singleVm.dotShow = false;
      singleVm.eventShow = false;
      singleVm.taskShow = false;
      singleVm.facilityShow = false;
    }
    else if(stage == 17){
      singleVm.resourceShow = true;
      singleVm.autoExtend = "progress-content-auto";
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

  singleVm.progressMenuIsOpen = false;
  singleVm.progrssMenuOpen = function(){
    // progress menu first open
    if(!singleVm.progressMenuIsOpen){
      singleVm.dialog = ngDialog.open({ 
        template: 'eventProgress.html',
        overlay: false,
        showClose: true,
        scope: $scope,  
        className: 'ngdialog-theme-default progress-menu draggable'       
      });
      singleVm.progressMenuIsOpen = true;
    }
    else{
      // progress menu opened for first time, then check whether it is opened atm
      if(!ngDialog.isOpen(singleVm.dialog.id)){
        console.log("in");
        singleVm.dialog = ngDialog.open({ 
          template: 'eventProgress.html',
          overlay: false,
          showClose: false,
          scope: $scope,  
          className: 'ngdialog-theme-default progress-menu draggable'       
        });
      }
    }
  };


  function createMarker(latlng, type) {
    // console.log(type);
    var markerIcon;
    if(type == 'hospital')
      markerIcon = "./img/ambulance.svg";
    else if(type == 'police')
      markerIcon = "./img/police-car.svg";
    else if(type == "fire_station")
      markerIcon = "./img/fire-truck.svg";
    var tempMarker = new google.maps.Marker({
        position: latlng,
        map: singleVm.map,
        
        // zIndex: Math.round(latlng.lat()*-100000)<<5,
        icon: markerIcon,
        animation: google.maps.Animation.DROP
        });
        // marker.myname = label;

    return tempMarker;
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
    singleVm.agentMarker[singleVm.agentNum] = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      animation: google.maps.Animation.BOUNCE,
      icon: "./img/robot.svg"
    })
    singleVm.agentNum++;
    var facilityElement = "";

    facilityElement = facilitiesInfo(facilityObj, "police");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });
    // marker.infoWin.open(singleVm.map, marker);
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
    singleVm.agentMarker[singleVm.agentNum] = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      animation: google.maps.Animation.BOUNCE,
      icon: "./img/robot.svg"
    })
    singleVm.agentNum++;
    var facilityElement = "";
    facilityElement = facilitiesInfo(facilityObj, "hospital");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });
    // marker.infoWin.open(singleVm.map, marker);
    // console.log(marker);
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
    singleVm.agentMarker[singleVm.agentNum] = new google.maps.Marker({
      position: latlng,
      map: singleVm.map,
      animation: google.maps.Animation.BOUNCE,
      icon: "./img/robot.svg"
    })
    singleVm.agentNum++;

    var facilityElement = "";
    facilityElement = facilitiesInfo(facilityObj, "fire_station");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(singleVm.map, marker);
    });
    // marker.infoWin.open(singleVm.map, marker);
    // return marker;
  }

  singleVm.getNumber = function(num) {
    var x = new Array(); 
    for(var i=0;i<num;i++){ 
      x.push(i+1); 
    } 
    return x;
  }

  singleVm.facilityIndex = 0;
  singleVm.facilityResourceList = [{}];
  function facilitiesInfo(facilityObj, facility_type){
    var type = "";
    if(facility_type == "police")
      type = "Police Car";
    else if(facility_type == "hospital")
      type = "Ambulance";
    else if(facility_type == "fire_station")
      type = "Fire Truck";

    var resource_number = facilityObj.resourceNum;

    var facility_name = facilityObj.name;

    singleVm.facilityIndex++;
    var x=[];
    for(var i=0;i<resource_number;i++){ 
      x.push(i+1); 
    }

    var resource_list = "";
    for(var i = 0; i < resource_number; i++){
      var index = i+1;
      resource_list += "<tr><td>"+index+"</td><td>"+type+"</td></tr>"; 
    }

    var element =   "<div>"+
              "<div class=\"infoWin-header-container\">"+
                "<div><p id=\"infoWin-header\" class=\"facility-header\">Location</p>"+"<span class=\"facility-name\">"+facility_name+"</span></div>"+
                "<div><p id=\"infoWin-header\" class=\"facility-header\">Distance</p>"+"<span class=\"facility-name\">"+facilityObj.distance+"</span></div>"+
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
                        resource_list+
                      "</table>"+
                    "</div>"+
              "</div>"+
            "</div>"

    return element;
  }

  function searchCircle(){
    var _radius = 5000;
    var rMin = 0;
    var rMax = _radius;
    var direction = 1;

    var circleOption = {
      center: singleVm.marker.position,
      fillColor: '#3878c7',
      fillOpacity: 0.4,
      map: singleVm.map,

      radius: 0,
      strokeColor: '#3878c7',
      strokeOpacity: 0.6,
      strokeWeight: 0.5
    }
    singleVm.circle = new google.maps.Circle(circleOption);

    var circleTimer = $interval(function(){
      var radius = singleVm.circle.getRadius();
      if((radius > rMax) || (radius) < rMin){
        direction *= -1;
      }
      var _par = (radius/_radius);

      circleOption.radius = radius + direction * 10;
      circleOption.fillOpacity = 0.2 * _par;

      singleVm.circle.setOptions(circleOption);
    }, 10, 500);
  }

    function setRoutes(){
      // console.log("setRoutes");
      console.log(startLoc);
      singleVm.circle.setMap(null);
      for(var i = 0; i < singleVm.requestMarkers.length; ++i){
        singleVm.requestMarkers[i].setMap(null);
        singleVm.sendMessageLine[i].setMap(null);
        // singleVm.messageLine[i].setMap(null);
      }

      for(var i = 0; i < singleVm.sendFinalLine.length; i++){
        singleVm.sendFinalLine[i].setMap(null);
      }



      // polyline.setMap(null);
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
          origin: startLoc[i].Location,
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
                strokeColor: '#1784cd',
                strokeWeight: 4
                });
            poly2[routeNum] = new google.maps.Polyline({
                path: [],
                strokeColor: '#1784cd',
                strokeWeight: 4
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
                    // console.log(startLoc[i].Type);
                    // marker[routeNum] = createMarker(legs[i].start_location,startLoc[i].Type);
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
          for(var i = 0; i < startLoc.length; ++i){
            marker[i] = createMarker(startLoc.Location, startLoc[i].Type);
          }           

          //map.fitBounds(bounds);

          $timeout(function(){
            startAnimation(routeNum)
          }, 6000);  
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
      ngDialog.openConfirm({
          template:'\
            <div>\
              <div class="modal-header safari_top_radius">\
                <div id="progress-title-content">\
                  <div class="icon-container">\
                    <span id="progress-title-icon"></span>\
                  </div>\
                  <span class="progress-title">Confirmation</span>\
                </div>  \
              </div>\
              <div id="confirm-content">\
                <p>Are you sure you want to stop the simulation?</p>\
                <div class="ngdialog-buttons modal-footer ">\
                    <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                    <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                </div>\
              </div>\
            </div>',
          plain: true,
          showClose: false,
          className: 'ngdialog-theme-default confirm-menu-container'
      }).then(function(value){
        $window.location.reload();
      });
  }

  // pause simulation
  singleVm.pauseTimeout = function(){

    if(playStop){
      console.log(currentProgressStage);
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


    function updateGPS(){

    }

    function getStat(){
      console.log("get stats");
      return $http({

        method  : 'POST',
        url     : '/singleEvent/GetStats',
        //     // set the headers so angular passing info as form data (not request payload)
        headers : { 'Content-Type': 'application/json' },
        data    : {
                   sim_id: facilityObj.sim_id
                  }

        }).then(function success(response) {
            console.log(response.data);
            statObj = response.data;

            singleVm.totalResourceNum = 0;
            var sumExpenditure = 0;
            var sumTime = 0;
            for(var i = 0; i < statObj.length; i++){
              singleVm.totalResourceNum+=statObj[i].num_resources;
              sumExpenditure+=statObj[i].total_expenditure;
              sumTime+=statObj[i].completion_time;
            }
            singleVm.totalCompleteTime = sumTime.toFixed(2);
            singleVm.totalExpenditure = sumExpenditure.toFixed(2);
        });   
    }

    function animate(index,d) {
      // console.log(singleVm.resourcesNum);
      markerStarted = true;
      current_point = d;
      if (d > eol[index]) {
          marker[index].setPosition(endLocation[index].latlng);
          // console.log("End of animation");
          count++;
          // console.log(count);
          // console.log(singleVm.resourcesNum);
          if(count == singleVm.resourcesNum){
            // close progress menu
            singleVm.dialog.close();

            // open statistic menu
            ngDialog.openConfirm({ 
              template: 'eventStatistic.html',
              overlay: true,
              showClose: false,
              closeByEscape: false,
              scope: $scope,
              className: 'ngdialog-theme-default statistic-menu draggable'       
            }).then(function(value){
                /* confirm end simulation
                      clear marker, polyline, event
                */
                $route.reload();
                $window.location.reload();
            });
          }
          return;
      }
      var p = polyline[index].GetPointAtDistance(d);
      // console.log(marker[index]);

      marker[index].setPosition(p);
      updatePoly(index,d);
      timerHandle[index] =  $timeout(function() {
        animate(index, (d + singleVm.step*5 + index*0.2));
      }, tick);
  }

    function startAnimation(index){

      eol[index] = polyline[index].Distance();

      poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});
      
      animate(index, 50);
      
    }

    function requestAnimate(index,d) {
      markerStarted = true;
      current_point = d;
      if (d > eol[index]) {
          singleVm.requestMarkers[index].setPosition(endLoc[index].latlng);
          // console.log("End of animation");
          return;
      }
      var p = singleVm.sendMessageLine[index].GetPointAtDistance(d);
      singleVm.requestMarkers[index].setPosition(p);
      updateRequestPoly(index,d);
      timerHandle[index] =  $timeout(function() {
        requestAnimate(index, (d + 100));
      }, tick);
  }

    function startRequestAnimation(index){

      eol[index] = singleVm.sendMessageLine[index].Distance();

      singleVm.messageLine[index] = new google.maps.Polyline({path: [singleVm.sendMessageLine[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});

      requestAnimate(index, 50);
    }

     function updateRequestPoly(i,d) {
    // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
      if (singleVm.messageLine[i].getPath().getLength() > 20) {
            singleVm.messageLine[i] = new google.maps.Polyline([singleVm.sendMessageLine[i].getPath().getAt(lastVertex-1)]);

          }

      if (singleVm.sendMessageLine[i].GetIndexAtDistance(d) < lastVertex + 2) {
          if (singleVm.messageLine[i].getPath().getLength() > 1) {
              singleVm.messageLine[i].getPath().removeAt(singleVm.messageLine[i].getPath().getLength() - 1)
          }
              singleVm.messageLine[i].getPath().insertAt(singleVm.messageLine[i].getPath().getLength(),singleVm.sendMessageLine[i].GetPointAtDistance(d));
      } else {
          posingleVm.messageLinely2[i].getPath().insertAt(singleVm.messageLine[i].getPath().getLength(),endLoc[i].latlng);
      }
   }

   function receiveAnimate(index,d) {
      markerStarted = true;
      current_point = d;
      if (d > eol[index]) {
          singleVm.requestMarkers[index].setPosition(singleVm.marker.position);
          // console.log("End of animation");
          return;
      }
      var p = singleVm.sendMessageLine[index].GetPointAtDistance(d);
      singleVm.requestMarkers[index].setPosition(p);
      updateReceivePoly(index,d);
      timerHandle[index] =  $timeout(function() {
        receiveAnimate(index, (d + 100));
      }, tick);
  }

    function startReceiveAnimation(index){

      eol[index] = singleVm.sendMessageLine[index].Distance();

      singleVm.messageLine[index] = new google.maps.Polyline({path: [singleVm.sendMessageLine[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});

      receiveAnimate(index, 50);
    }
  
     function updateReceivePoly(i,d) {
    // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
      if (singleVm.messageLine[i].getPath().getLength() > 20) {
            singleVm.messageLine[i] = new google.maps.Polyline([singleVm.sendMessageLine[i].getPath().getAt(lastVertex-1)]);

          }

      if (singleVm.sendMessageLine[i].GetIndexAtDistance(d) < lastVertex + 2) {
          if (singleVm.messageLine[i].getPath().getLength() > 1) {
              singleVm.messageLine[i].getPath().removeAt(singleVm.messageLine[i].getPath().getLength() - 1)
          }
              singleVm.messageLine[i].getPath().insertAt(singleVm.messageLine[i].getPath().getLength(),singleVm.sendMessageLine[i].GetPointAtDistance(d));
      } else {
          singleVm.messageLine[i].getPath().insertAt(singleVm.messageLine[i].getPath().getLength(),singleVm.marker.position.latlng);
      }
   }



   singleVm.getCount = function(i) {
    var iCount = iCount || 0;
    for (var j = 0; j < singleVm.allocatedResources.length; j++) {
      if (singleVm.allocatedResources[j].Facility == i) {
        iCount++;
      }
    }
    return iCount;
  }

});


app.filter('unique', function(){
  return function(collection, keyname){
    var output = [];
    var keys = [];

    angular.forEach(collection, function(item){
      var key = item[keyname];
      if(keys.indexOf(key) === -1){
        keys.push(key);
        output.push(item);
      }
    });
    return output;
  };
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

