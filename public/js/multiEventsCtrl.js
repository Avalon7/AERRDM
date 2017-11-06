app.controller('multiEventCtrl', function(NgMap, $q, $compile, $scope, $mdDialog, $http, $timeout, $interval, ngDialog, localStorageService, $window){

  //map initialization
  var multiVm = this;
  var directionDisplay;
  var directionsService;
  var stepDisplay;
  $scope.headerMes = "Multi Event";

  multiVm.eventStarted = false;

  multiVm.markerNotPlace = true;

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
  multiVm.markerIndex = 0;
  multiVm.markersList = [];
  multiVm.eventList = [];
  multiVm.eventObj = [];
  multiVm.circles = [];
  multiVm.simID = 0;

  

  var speed = 0.000005, wait = 1;
  var infowindow = null;
  
  var myPano;
  var panoClient;
  var nextPanoId;

  multiVm.place = ["UTS Library", "UNSW Art & Design", "Sydney Central Station", "Sydney Opera House", "Moonlight Ciinema Sydney", "Woolahra", "Westfield Bondi Junction"];

  NgMap.getMap("map").then(function(map){
    multiVm.map = map;
    multiVm.map.setZoom(14);
    // open hamburger menu as default
    multiVm.hamCheck = true;
    // show search box as defualt
    multiVm.searchExtend();
  });

  function clearMapClickEvent(){
    //clear onclick event in map
    google.maps.event.clearListeners(multiVm.map, 'click');
  }

  // detect ESC key to remove pin cursor
  multiVm.mapKeyUp = function($event){
    var onKeyUpResult = $event.keyCode;
    if(onKeyUpResult == 27)
      defaultCursor();
  }

  // set cursor back to default
  function defaultCursor() {
    clearMapClickEvent();
    multiVm.map.setOptions({draggableCursor:''});
  };

  // random location
  multiVm.randomLocation = function(){
    if(multiVm.marker){
      // console.log("in");
      for(var i = 0; i < multiVm.markersList.length; i++){
        multiVm.markersList[i].setMap(null);
        multiVm.eventList[i] = [];
      }
      multiVm.eventList.length = 0;
      multiVm.markerIndex = 0;
      multiVm.markersList.length = 0;
      multiVm.marker.setMap(null);
    }

    var max = 5;
    var min = 2;
    var placeArrLen = multiVm.place.length;
    var eventNum = Math.floor((Math.random()*(max-min+1)) + min);
    multiVm.eventArr = [];
    var indexList = [];
    var results = [];


    var locationMinIndex = 1;
    var locationMaxIndex = (multiVm.place.length-1);
    // while(indexList.length < eventNum){
    for(var i = 0; i < eventNum; i++){
      var index = Math.floor((Math.random()*(locationMaxIndex-min+1))+min);
      if(indexList.indexOf(index) === -1){
        indexList.push(index);
        multiVm.eventArr.push(multiVm.place[index]);
      }
    }
    for(var i = 0; i < multiVm.eventArr.length; ++i){
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'address': multiVm.eventArr[i]}, function(results, status){
          multiVm.map.setCenter(results[0].geometry.location);
          multiVm.placeMarkerByRandomAndSearch(results[0].geometry.location);
        });
    }
  }

  // enable user to click on the map to place marker
  multiVm.putMarker = function(){
    if(!multiVm.eventStarted){
      // change cursor to marker
      multiVm.map.setOptions({draggableCursor:'url(img/placeholder.svg), auto'});
      // add click event on map
      google.maps.event.addListener(multiVm.map, 'click', function(event){
        multiVm.placeMarker(event);
      });
    }
  }

  // current location
  multiVm.currentLocation = function(){
    if(!multiVm.eventStarted){
      navigator.geolocation.getCurrentPosition(function(position){
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        multiVm.map.setCenter(new google.maps.LatLng(pos.lat, pos.lng));
        console.log("processing");
        multiVm.placeMarkerCurrent(pos);
      });
    }
  }

  // triggered when place changed
  multiVm.placeChanged = function(){
    if(!multiVm.eventStarted){
      multiVm.markerNotPlace = false;
      var place = this.getPlace();
      multiVm.map.setCenter(place.geometry.location);
      // multiVm.placeMarkerByRandomAndSearch(multiVm.place.geometry.location);
    }
  }

  //place a marker by clicking mouse
  multiVm.placeMarker = function(e){
    if(multiVm.marker){
      multiVm.markerIndex++;
    }
    console.log("put marker");

    multiVm.marker = new google.maps.Marker({
      position: e.latLng,
      map: multiVm.map,
      icon: "img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    multiVm.marker.set("id", multiVm.markerIndex);

    multiVm.markersList.push(multiVm.marker);

    if(multiVm.markersList.length > 0){
      multiVm.markerNotPlace = false;
      multiVm.eventIsSet = true;
    }
    
    //generate factor
    multiVm.factorGenerate(multiVm.marker.get("id"));
    //add element to marker
    multiVm.markerElement(multiVm.marker.get("id"));

  }

  multiVm.placeMarkerCurrent = function(pos){
    if(multiVm.marker){
      multiVm.markerIndex++;
    }

    multiVm.marker = new google.maps.Marker({
      position: {lat: pos.lat, lng: pos.lng},
      map: multiVm.map,
      icon: "img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });
    multiVm.factorGenerate(multiVm.markerIndex);
    multiVm.map.setZoom(14);
    multiVm.markerElement();
  }

  //place a marker by random and search
  multiVm.placeMarkerByRandomAndSearch = function(loc){
    if(multiVm.markersList.length > 0){
      multiVm.markerIndex++;
    }
    multiVm.marker = new google.maps.Marker({
      position: loc,
      map: multiVm.map,
      icon: "img/placeholder.svg",
      draggable: true,
      animation: google.maps.Animation.DROP
    });
    multiVm.marker.set("id", multiVm.markerIndex);

    multiVm.markersList.push(multiVm.marker);
    multiVm.factorGenerate(multiVm.markerIndex);
    multiVm.markerElement(multiVm.markerIndex);
    multiVm.markerNotPlace = false;
  }

  // add element to marker
  multiVm.markerElement = function(index){    
     var htmlElement = "  <div><div><p id=\"infoWin-header\">Event Setting</p></div> " + 
      "<div><button class=\"button continue-btn ripple\" ng-click=\"multiVm.setDataField(multiVm.selectedEventIndex)\">" + "Set event data" + "</button></div></div>"


    // var htmlElement = "  <div><div><p id=\"infoWin-header\">Event Setting"+index+"</p></div> " + 
    // "<div><button class=\"button continue-btn ripple\" ng-click=\"multiVm.setDataField(index)\">" + "Set event data" + "</button></div></div>"
    compiled = $compile(htmlElement)($scope);
    multiVm.marker.infoWin = new google.maps.InfoWindow({
      content: compiled[0]
    })
    // multiVm.marker.addListener('click', function($scope){
    //   multiVm.marker.infoWin.open(multiVm.map, multiVm.marker);
    // });
    multiVm.marker.addListener('click', function() {  
        multiVm.marker.infoWin.open(multiVm.map, this);
        console.log("Marker ID: "+this.get("id"));
        multiVm.selectedEventIndex = this.get("id");
    });

    //set info windows
    multiVm.lastOpenedInfoWindow = multiVm.marker.infoWin;

  }

  // close current opened info window
  multiVm.closeInfoWin = function(){
    if (multiVm.lastOpenedInfoWindow) {
          multiVm.lastOpenedInfoWindow.close();
      }
  }
  
  // redirect function
  multiVm.callFunction = function(name){
    if(angular.isFunction(multiVm[name]))
      multiVm[name]()
  }

  // info window redirect function
  multiVm.infoWinRedirect = function(toFunction){
    // remove last compile element object
    multiVm.compiled.remove();
    // get function name 
    multiVm.to_function = toFunction;
    multiVm.htmlElement = "  <div><div><p id=\"infoWin-header\">Event information</p></div> " + 
    "<div><button class=\"button continue-btn ripple\" ng-click=\"multiVm.callFunction(multiVm.to_function)\">" + "View progress" + "</button></div></div>"
    // var htmlElement = "<showTag></showTag>"
    //need to compile 
    multiVm.compiled = $compile(multiVm.htmlElement)($scope)
    multiVm.marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: multiVm.compiled[0]
    });
  }

  multiVm.category_list = ["Medical Help", "Urban Fire", "Chemical Leakage"];


  /* factor generator */
  multiVm.levelGenerator = function(){
    return Math.floor((Math.random()*5)+1);
  }
  multiVm.categoryGenerator = function(){
    var size = multiVm.category_list.length;
    return Math.floor((Math.random()*size));
  }
  multiVm.expenditureGenerator = function(){
    var max = 200; 
    var min = 0;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  multiVm.velocityGenerator = function(){
    var max = 100;
    var min = 20;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  multiVm.deadlineGenerator = function(){
    var max = 30;
    var min = 15;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  multiVm.minExpenditureGenerator = function(){
    var max = 100; 
    var min = 0;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  multiVm.maxExpenditureGenerator = function(){
    var max = 200;
    var min = 101;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  multiVm.minVelocityGenerator = function(){
    var max = 60; 
    var min = 20;
    return Math.floor((Math.random()*(max-min+1))+min);
  }
  multiVm.maxVelocityGenerator = function(){
    var max = 100;
    var min = 61;
    return Math.floor((Math.random()*(max-min+1))+min);
  }

  /* to-be-modified */
  multiVm.factorGenerate = function(index){
    multiVm.level = multiVm.levelGenerator();
    multiVm.category = multiVm.categoryGenerator();
    multiVm.expenditure = multiVm.expenditureGenerator();
    // multiVm.minExpenditure = multiVm.minExpenditureGenerator();
    // multiVm.maxExpenditure = multiVm.maxExpenditureGenerator();
    multiVm.velocity = multiVm.velocityGenerator();
    multiVm.minvelocity = multiVm.minVelocityGenerator();
    multiVm.maxvelocity = multiVm.maxVelocityGenerator();
    multiVm.deadline = multiVm.deadlineGenerator();
    multiVm.minResource = 2;
    multiVm.maxResource = 10;

    if(index == 0){
      multiVm.minExpenditure = multiVm.minExpenditureGenerator();
      multiVm.maxExpenditure = multiVm.maxExpenditureGenerator();
    }

    multiVm.factor = {
      'ID': index,
      'Severity': multiVm.level,
      'Category': multiVm.category_list[multiVm.category],
      'Resource avg. expenditure': multiVm.expenditure,
      'Min expenditure': multiVm.minExpenditure,
      'Max expenditure': multiVm.maxExpenditure,
      'Min velocity': multiVm.minvelocity,
      'Max velocity': multiVm.maxvelocity,
      'Resource avg. velocity': multiVm.velocity,
      'Min resource': multiVm.minResource,
      'Max resource': multiVm.maxResource,
      'Deadline': multiVm.deadline,
      'Location': {lat: multiVm.marker.position.lat(), lng: multiVm.marker.position.lng()}
    } 
    // var tmp = {
    //   'ID': index,
    //   'Location': {lat: multiVm.marker.position.lat(), lng: multiVm.marker.position.lng()},
    //   'Category': multiVm.category_list[multiVm.category],
    //   'Severity': multiVm.level,
    //   'Deadline': multiVm.deadline
    // }
    console.log("Event List Index: "+index);

    multiVm.eventList[index] = new Array();
    multiVm.eventList[index] = multiVm.factor;
    // multiVm.eventObj.push(tmp);
  }
  /* end factor generator */

  // open progress menu
    multiVm.progrssMenuOpen = function () {
      ngDialog.open({ 
        template: 'eventProgress.html',
        overlay: false,
        showClose: false,
        scope: $scope,
        className: 'ngdialog-theme-default progress-menu draggable'       
      });
    };


  // 
  multiVm.apply = function(){
    console.log(multiVm.factor);
    $mdDialog.hide();
  }

  // pop out event overview menu
  multiVm.confirmStart = function(){
    $mdDialog.hide();
    multiVm.closeInfoWin();
    //pop out overview event windows
    multiVm.overviewMenu();
  }

  // event overview windows, confirm to start event
  multiVm.overviewMenu = function () {
    ngDialog.openConfirm({ 
      template: 'multiEventOverview.html',
      overlay: true,
      showClose: false,
      closeByEscape: true,
      scope: $scope,
      className: 'ngdialog-theme-default overview-menu draggable'       
    }).then(function(value){
        multiVm.startMultiEvent();
    });
  };

  // set event
  multiVm.eventSet = function(){
      $mdDialog.hide();
      multiVm.closeInfoWin();
      multiVm.eventIsSet = true;
    }

  // now start the simulation

  multiVm.startMultiEvent = function(){
    // close factor menu
    multiVm.eventStarted = true;
    // var progressStage = 0;
    // close hamburger menu
    multiVm.hamCheck = false;
    // hide search box
    multiVm.searchExtend();
    for(var i = 0; i < multiVm.markersList.length; ++i){
      multiVm.markersList[i].setDraggable(false);
    }

    // clear onclick event in map
    clearMapClickEvent();

    // change back to default google map cursor
    defaultCursor();
    // // start progress menu animation
    progressInfoControl(12);

    // open progress menu
    multiVm.progrssMenuOpen();

    multiVm.getFaciLoc().then(searchAni).then(getTasks);
    
    multiVm.panelShow = "true";
  } 


  searchAni = function(){
    var defer = $q.defer();
    for(var i = 0; i < multiVm.eventObj.length; ++i){
      console.log("IN");
      searchCircle(multiVm.eventObj[i], i);
    }
    defer.resolve("resolved");
    
    return defer.promise;
  }

  multiVm.getFaciLoc = function(){

    // multiVm.eventList[index]
    for(var i = 0; i < multiVm.eventList.length; i++){
      console.log(multiVm.eventList[i]);
      var tmp = {
        'ID': multiVm.eventList[i].ID,
        'Location': {lat: multiVm.eventList[i].Location.lat, lng: multiVm.eventList[i].Location.lng},
        'Category': multiVm.eventList[i].Category,
        'Severity': multiVm.eventList[i].Severity,
        'Deadline': multiVm.eventList[i].Deadline
      }
      multiVm.eventObj.push(tmp);
    }

    return $http({

      method  : 'POST',
      url     : '/multiEvent',
      //     // set the headers so angular passing info as form data (not request payload)
      headers : { 'Content-Type': 'application/json' },
      data    : {
                  Expenditure: {min: multiVm.minExpenditure, max: multiVm.maxExpenditure},
                  ResourceNum: {min: multiVm.factor['Min resource'], max: multiVm.factor['Max resource']},
                  Events: multiVm.eventObj
                }

      }).then(function success(response) {

        console.log(response.data);
        multiVm.simID = response.data.sim_id;
          for(var i = 0; i < response.data.facilities.length; ++i){
            if(response.data.facilities[i].type == "hospital"){
              putHospital(response.data.facilities[i]);
            }
            else if(response.data.facilities[i].type == "police"){
              putPolice(response.data.facilities[i]);
            }
            else if(response.data.facilities[i].type == "fire_station"){
              putFire(response.data.facilities[i]);
            }
          }


        return response.data;

      });
  }


  // get task from server
  getTasks = function(dataObj){
    console.log("getTasks");

    return $http({

      method  : 'POST',
      url     : '/multiEvent/assignResources',
      headers : { 'Content-Type': 'application/json' },
      data    : {
                  sim_id: multiVm.simID
      }
    }).then(function success(response){
      // if success
      var keys = [];
      multiVm.allResource = [];
      multiVm.distinctFac = [];
      multiVm.numSelectedFac = 0;
      multiVm.numResourceAssign = 0;
      multiVm.totalExpenditure = 0;
      multiVm.totalCompletionTime = 0;
      multiVm.eachEventExpenditure = {};
      multiVm.eachEvent = [];

      console.log(response.data);
      console.log(response.data.FinalResults);
      multiVm.resourceAllocation(response.data.FinalResults);
      for(var i = 0; i < Object.keys(response.data.FinalResults).length; ++i){
        var eachExpenditure = 0;
        var eachCompleteTime = 0;
        for(var j = 0; j < response.data.FinalResults[i].length; ++j){
          startLoc.push(response.data.FinalResults[i][j]);
          multiVm.allResource.push(response.data.FinalResults[i][j]);
          multiVm.totalCompletionTime += response.data.FinalResults[i][j].Duration;
          console.log(response.data.FinalResults[i][j].Expenditure);
          eachExpenditure += response.data.FinalResults[i][j].Expenditure;  
          eachCompleteTime += response.data.FinalResults[i][j].Duration;
        }

        multiVm.eachEvent[i] = {
          Expenditure: eachExpenditure.toFixed(2),
          Assigned: response.data.FinalResults[i].length,
          TimeComplete: eachCompleteTime.toFixed(2)
        }

        setRoutes(startLoc, multiVm.eventList[i]);
        startLoc = [];
      }
      console.log(multiVm.allResource);
      angular.forEach(multiVm.allResource, function(item){
        var key = item['Facility'];
        if(keys.indexOf(key) === -1){
          keys.push(key);
          multiVm.distinctFac.push(item);
        }
      });

      /** number of facility selected and number of resources have been assigned */
      multiVm.numResourceAssign = multiVm.allResource.length;
      multiVm.numSelectedFac = multiVm.distinctFac.length;

      console.log(multiVm.eachEventExpenditure);

      for(var i = 0; i < multiVm.numResourceAssign; i++){
        multiVm.totalExpenditure += multiVm.allResource[i].Expenditure;
      }
      multiVm.totalExpenditure = multiVm.totalExpenditure.toFixed(2);
      multiVm.totalCompletionTime = multiVm.totalCompletionTime.toFixed(2);

    })
  }

  // store allocated resources
  multiVm.resourceAllocation = function(resourceObj){
    multiVm.allocatedResources = [];
    multiVm.avgVelocity = 0;
    multiVm.avgExpenditure = 0;
    multiVm.resourceSent = 0;
    multiVm.numResource = 0;


    /** dentify type */
    for(var i = 0; i < Object.keys(resourceObj).length; i++){
      for(var j = 0; j < resourceObj[i].length; j++){
        var type = " ";
        console.log(resourceObj[i][j]);
        if(resourceObj[i][j].Type == "fire_station")
          type = "Fire Truck";
        else if(resourceObj[i][j].Type == "hospital")
          type = "Ambulance";
        else if(resourceObj[i][j].Type == "police")
          type = "Police Car";

        /** push resource into object */
        multiVm.allocatedResources[multiVm.numResource] = {
          Type: type,
          Expenditure: resourceObj[i][j].Expenditure,
          Duration: resourceObj[i][j].Duration.toFixed(2),
          Distance: resourceObj[i][j].Distance.toFixed(2),
          Facility: resourceObj[i][j].Facility,
          Assign: i+1
        };

        multiVm.avgExpenditure += resourceObj[i][j].Expenditure;
        multiVm.avgVelocity += resourceObj[i][j].Velocity;

        multiVm.numResource++;
      }
    }
    console.log(multiVm.numResource);
    console.log(multiVm.allocatedResources);
  }

  // open factor dialog menu to let user change factor
  multiVm.setDataField = function(index){
    // generate factor
    $mdDialog.show(
      {
        templateUrl: "multiFactorDialog.html",
        clickOutsideToClose: true,
            scope: $scope,
            preserveScope: true,
            controller: function($scope){

            }
    });
  };

  // reset factor
  multiVm.reset = function () {
    multiVm.factorGenerate(multiVm.selectedEventIndex);
  }

  // close dialog
  multiVm.close = function () {
    $mdDialog.cancel();
  }


  var totalProgressStage = 6;
  var currentProgressStage = 0;
  var progressHandle = [];
  // var delayArray = [0, 1500, 3500, 5500, 7500, 7600, 8100];
  var delayArray = [0, 5000, 5000, 5000, 5000, 100, 500, 500, 950, 1500, 5500, 5500, 5500];


  // progress controll
  function progressInfoControl(stage){
    console.log(stage);
    // currentProgressStage = stage;
    if(stage > delayArray.length){
      return;
    }
    if(stage == 0){
      multiVm.stage = "Analysing Event";
    }
    else if(stage == 1){
      multiVm.eventShow = true;
    }
    else if(stage == 2){
    multiVm.stage = "Establishing Plan";
    }
    else if(stage == 3){
      multiVm.taskShow = true;
    }
    else if(stage == 4){
      multiVm.stage = "Searching for Facilities";
    }
    else if(stage == 5){
      multiVm.containerExtend = 'progress-first-extend';
      multiVm.contentExtend = 'progress-content-extend';
    }
    else if(stage == 6){
      multiVm.radarShow = true;
    }
    else if(stage == 7){
      multiVm.containerExtend = 'progress-second-extend';
      multiVm.facilityShow = true;
    }
    else if(stage == 8){
      multiVm.radarShow = false;
    }
    else if(stage == 9){
      multiVm.stage = "Sending Tasks Info to Facilities";
      multiVm.dotShow = true;
    }
    else if(stage == 10){
      multiVm.stage = "Receiving Response from Facilities";
    }
    else if(stage == 11){
      multiVm.stage = "Analysing Response from Facilities";
    }
    else if(stage == 12){
      multiVm.stageIcon = "fa fa-play-circle-o fa-lg";
      multiVm.stage = "Resources Allocaton";
    }


    stage++;
    currentProgressStage = stage;
    progressHandle[stage] = $timeout(function(){
      progressInfoControl(stage);
    }, delayArray[stage]);

  }

  multiVm.searchExtend = function(){
    defaultCursor();
    multiVm.searchBoxExtend = "";
    if(!multiVm.searchShow){
      multiVm.searchBoxExtend = "animated fadeIn";
      multiVm.searchShow = true;
    }
    else{
      multiVm.searchBoxExtend = "animated fadeOut ";
      multiVm.searchShow = false;
    }
  }

  multiVm.progressMenuIsOpen = false;
  multiVm.progrssMenuOpen = function(){
    // progress menu first open
    if(!multiVm.progressMenuIsOpen){
      multiVm.dialog = ngDialog.open({ 
        template: 'multiEventProgress.html',
        overlay: false,
        showClose: false,
        scope: $scope,  
        className: 'ngdialog-theme-default progress-menu draggable'       
      });
      multiVm.progressMenuIsOpen = true;
    }
    else{
      // progress menu opened for first time, then check whether it is opened atm
      if(!ngDialog.isOpen(multiVm.dialog.id)){
        multiVm.dialog = ngDialog.open({ 
          template: 'eventProgress.html',
          overlay: false,
          showClose: false,
          scope: $scope,  
          className: 'ngdialog-theme-default progress-menu draggable'       
        });
      }
    }
  };

  // create marker for vehcile
   function createMarker(latlng, type) {
    var markerIcon;
    if(type == 'hospital')
      markerIcon = "./img/ambulance.svg";
    else if(type == 'police')
      markerIcon = "./img/police-car.svg";
    else if(type == "fire_station")
      markerIcon = "./img/fire-truck.svg";
    var tempMarker = new google.maps.Marker({
        position: latlng,
        map: multiVm.map,
        
        icon: markerIcon,
        animation: google.maps.Animation.DROP
        });


    return tempMarker;
  } 


  // put police station marker to polica station
  function putPolice(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: multiVm.map,
      title: label,
      icon: "./img/police-station.svg",
      animation: google.maps.Animation.DROP
    })

    var facilityElement = "";

    facilityElement = facilitiesInfo(facilityObj, "police");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(multiVm.map, marker);
    });

  }

  // put hospital marker to hospital
  function putHospital(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: multiVm.map,
      title: label,
      icon: "./img/hospital.svg",
      animation: google.maps.Animation.DROP
    })
    var facilityElement = "";
    facilityElement = facilitiesInfo(facilityObj, "hospital");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(multiVm.map, marker);
    });

    // return marker;
  }

  // put fire station marker to fire station
  function putFire(facilityObj, label, type){
    var iconUrl;
    var latlng = facilityObj.location;
    var marker = new google.maps.Marker({
      position: latlng,
      map: multiVm.map,
      title: label,
      icon: "./img/fire-station.svg",
      animation: google.maps.Animation.DROP
    })

    var facilityElement = "";
    facilityElement = facilitiesInfo(facilityObj, "fire_station");

    var compiled = $compile(facilityElement)($scope)
    marker.infoWin = new google.maps.InfoWindow({
      // content: "<showTag></showTag>"
      content: compiled[0]

    });
    //show the infomation window
    marker.addListener('click', function($scope){
      marker.infoWin.open(multiVm.map, marker);
    });

    // return marker;
  }

  // facility info window attribute
  function facilitiesInfo(facilityObj, facility_type){
    var type = "";
    var resource_number = 0;
    multiVm.number = 0;
    if(facility_type == "police")
      type = "Police Car";
    else if(facility_type == "hospital")
      type = "Ambulance";
    else if(facility_type == "fire_station")
      type = "Fire Truck";

    var resource_number = facilityObj.resourceNum;
    var facility_name = facilityObj.name;

    multiVm.facilityIndex++;
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
                        "<tr>"+
                          resource_list
                        "</tr>"+
                      "</table>"+
                    "</div>"+
              "</div>"+
            "</div>"

    return element;
  }

  // search radar animation
  function searchCircle(event, index){
    var _radius = event.Severity * 1000;
    // var _radius = 5000;
    var rMin = 0;
    var rMax = _radius;
    var direction = 1;

    var circleOption = {
      center: event.Location,
      fillColor: '#3878c7',
      fillOpacity: 0.2,
      map: multiVm.map,

      radius: _radius,
      strokeColor: '#3878c7',
      strokeOpacity: 0.2,
      strokeWeight: 0.2
    }
    multiVm.circles[index] = new google.maps.Circle(circleOption);

    // var circleTimer = $interval(function(){
    //   var radius = multiVm.circles[index].getRadius();
    //   if((radius > rMax) || (radius) < rMin){
    //     direction *= -1;
    //   }
    //   var _par = (radius/_radius);

    //   circleOption.radius = radius + direction * 10;
    //   circleOption.fillOpacity = 0.2 * _par;

    //   multiVm.circles[index].setOptions(circleOption);
    // }, event.Severity * 5, event.Severity * 100);
  }

  // set route between event and facility
    function setRoutes(start, end){

      console.log(start);
      console.log(end);
      //delete map circle instances
//       for(let i = 0; i < multiVm.circles.length; ++i){
//         multiVm.circles[i].setMap(null);
//       }
      var directionDisplay = new Array();
      var startLocLength;

      var rendererOptions = {
        map: multiVm.map,
        suppressMarkers : true,
        preserveViewport: true
      }

      directionsService = new google.maps.DirectionsService();

      var travelMode = google.maps.DirectionsTravelMode.DRIVING;
      var requests = new Array();
      for(var i = 0; i < start.length; ++i){
        requests[i] = {
          origin: start[i].Location,
          destination: end.Location,
          travelMode: travelMode
        };
        directionsService.route(requests[i], makeRouteCallback(i, directionDisplay[i], start[i].Type));
      }

      
      function makeRouteCallback(routeNum, dip, type){
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
                strokeWeight: 3 
                });
            poly2[routeNum] = new google.maps.Polyline({
                path: [],
                strokeColor: '#1784cd',
                strokeWeight: 3
                });    


            var path = response.routes[0].overview_path;
                var legs = response.routes[0].legs;


                disp = new google.maps.DirectionsRenderer(rendererOptions);     
                disp.setMap(multiVm.map);

                disp.setDirections(response);

                //create resources markers
                for (i = 0; i < legs.length; i++) {

                  if (i == 0) { 
                    startLocation[routeNum].latlng = legs[i].start_location;
                    startLocation[routeNum].address = legs[i].start_address;
                    // marker = google.maps.Marker({map:map,position: startLocation.latlng});
                    marker[routeNum] = createMarker(legs[i].start_location, type);
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
          polyline[routeNum].setMap(multiVm.map);             

          //map.fitBounds(bounds);

          $timeout(function(){
            startAnimation(routeNum)
          }, 25000);     
        }
      } 
    }


    var eol = [];
    var lastVertex = 1;
    var stepnum=0;
    var maxStep = 5; // max distance per move
    multiVm.step = 0.1; // 3; // metres
    var playStop = true; // true = play, false = stop

    var tick = 100; // milliseconds

    var current_index = 0;
    var current_point = [];

    var markerStarted = false;

    // control simulation speed
    multiVm.stepControl = function(step){
      multiVm.step = multiVm.step + step;
      if(multiVm.step > maxStep){
        multiVm.step = maxStep;
      }
      else if(multiVm.step < 0.1){
        multiVm.step = 0.1;
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
  multiVm.stopTimeout = function(){
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
  multiVm.pauseTimeout = function(){
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
      multiVm.pause = "pause-effect";
      multiVm.pauseIcon = true;
    }
  }

  // play simulation after paused
  multiVm.restartTimeout = function(){
    if(!playStop){
      playStop = true;
      if(markerStarted){
        // need to fix bug
        timerHandle[0] = $timeout(function() {
            animate(0, (current_point + multiVm.step*5));
          }, tick);
          timerHandle[1] = $timeout(function() {
            animate(1, (current_point + multiVm.step*5));
          }, tick);
      }

      multiVm.pause = "";
        progressHandle[currentProgressStage] = $timeout(function(){
          progressInfoControl(currentProgressStage);
        }, delayArray[currentProgressStage]);
        multiVm.pauseIcon = false;
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
        animate(index, (d + multiVm.step*5));
      }, tick);
  }

  // start resource deploy simulation
    function startAnimation(index){

      eol[index] = polyline[index].Distance();

      poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)],
              strokeColor:"#FFFF00", strokeWeight:3});

      animate(index, 50);
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
