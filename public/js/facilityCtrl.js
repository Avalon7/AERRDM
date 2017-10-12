app.controller('facilityCtrl', function(NgMap, $compile, $scope, $mdDialog, $http, $timeout, $interval, ngDialog){
	var facilityVm = this;

	var accessData = window.localStorage['selectedFacility'];

	facilityVm.selectedFacility = angular.fromJson(accessData);

	console.log(facilityVm.selectedFacility);

    var loc = facilityVm.selectedFacility.Location;
    console.log(loc);

	NgMap.getMap("map").then(function(map){
        facilityVm.map = map;
        facilityVm.map.setZoom(14);
        // show search box as defualt
        // facilityVm.searchExtend();
        var marker = new google.maps.Marker({
            position: loc,
            map: facilityVm.map,
            icon: "./img/hospital.svg",
            animation: google.maps.Animation.DROP
        });
        console.log(marker);
        marker.setMap(facilityVm.map);
        facilityVm.map.setCenter(loc);
    });

    

    

    //
    // updateGPS = function(){
    // 	$http({
    // 		method	: 'POST',
	   //  	url		: '',
	   //  	headers	: { 'Content-Type': 'application/json' },
	   //  	data 	: {
	   //  				sim_id: facilityVm.selectedFacility.sim_id
	   //  	}
    // 	}).then(function success(response)){

    // 	}
   
});
