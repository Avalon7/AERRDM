app.controller('facilityCtrl', function(NgMap, $compile, $scope, $mdDialog, $http, $timeout, $interval, ngDialog){
	var facilityVm = this;

	var accessData = window.localStorage['selectedFacility'];
    var resourceNum;
    var resourceMarkers = [];
	facilityVm.selectedFacility = angular.fromJson(accessData);
    var eventLocation = angular.fromJson(localStorage["eventLocation"]);
    /** event information */
    facilityVm.eventStatis = angular.fromJson(localStorage['eventStatis']);
    /** simulatoin information */
    facilityVm.simStatis = angular.fromJson(localStorage['simulationStatis']);
    /** resources information */
    facilityVm.resource = angular.fromJson(localStorage['resources']);
    console.log(accessData);
    var count = 0;
    resourceNum = facilityVm.resource.length;

    var timerHandle = [];
    var polyline = [];
    var poly2 = [];
    var startLocation = [];
    var endLocation = [];
    var eol = [];
    var lastVertex = 1;
    var stepnum=0;
    var maxStep = 5; /** max distance per move */
    facilityVm.step = 0.1; /** metres */
    var playStop = true; /** true = play, false = stop */

    var tick = 100; /** milliseconds */

    var loc = facilityVm.selectedFacility.Location;
    console.log(facilityVm.selectedFacility.Type);

	NgMap.getMap("map").then(function(map){
        facilityVm.map = map;
        facilityVm.map.setZoom(14);

        if(facilityVm.selectedFacility.Type == "Police Station"){
            var marker = new google.maps.Marker({
                position: loc,
                map: facilityVm.map,
                icon: "./img/police-station.svg",
                animation: google.maps.Animation.DROP
            });
            for(var i = 0; i < resourceNum; ++i){
                resourceMarkers[i] = new google.maps.Marker({
                    position: loc,
                    map: facilityVm.map,
                    icon: "./img/police-car.svg"
                });
            }
        }
        else if(facilityVm.selectedFacility.Type == "Fire Station"){
            var marker = new google.maps.Marker({
                position: loc,
                map: facilityVm.map,
                icon: "./img/fire-station.svg",
                animation: google.maps.Animation.DROP
            });
            for(var i = 0; i < resourceNum; ++i){
                resourceMarkers[i] = new google.maps.Marker({
                    position: loc,
                    map: facilityVm.map,
                    icon: "./img/fire-truck.svg"
                });
            }
        }
        else if(facilityVm.selectedFacility.Type == "Hospital"){
            var marker = new google.maps.Marker({
                position: loc,
                map: facilityVm.map,
                icon: "./img/hospital.svg",
                animation: google.maps.Animation.DROP
            });
            for(var i = 0; i < resourceNum; ++i){
                resourceMarkers[i] = new google.maps.Marker({
                    position: loc,
                    map: facilityVm.map,
                    icon: "./img/ambulance.svg"
                });
            }
        }

        var eventLoc = new google.maps.Marker({
            position: eventLocation,
            map: facilityVm.map,
            icon: "./img/placeholder.svg",
            animation: google.maps.Animation.DROP
        });

        marker.setMap(facilityVm.map);
        facilityVm.map.setCenter(loc);

        // setRoutes();

        function setRoutes(){

              var directionDisplay = new Array();
              var startLocLength;

              var rendererOptions = {
                map: facilityVm.map,
                suppressMarkers : true,
                preserveViewport: true
              }

              directionsService = new google.maps.DirectionsService();

              var travelMode = google.maps.DirectionsTravelMode.DRIVING;
              var requests = new Array();
              for(var i = 0; i < resourceNum; ++i){
                requests[i] = {
                  origin: loc,
                  destination: eventLocation,
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
                    disp.setMap(facilityVm.map);

                    disp.setDirections(response);

                    /** create resources markers */
                    for (i = 0; i < legs.length; i++) {

                      if (i == 0) { 
                        startLocation[routeNum].latlng = legs[i].start_location;
                        startLocation[routeNum].address = legs[i].start_address;
                      }
                      endLocation[routeNum].latlng = legs[i].end_location;
                      endLocation[routeNum].address = legs[i].end_address;
                      var steps = legs[i].steps;

                      for (j = 0; j < steps.length; j++) {
                        var nextSegment = steps[j].path;                
                        var nextSegment = steps[j].path;

                        for (k = 0;k < nextSegment.length; k++) {

                            polyline[routeNum].getPath().push(nextSegment[k]);
                        }
                      }
                    }               
              }
              polyline[routeNum].setMap(facilityVm.map);  
              for(var i = 0; i < resourceNum; ++i){
                resourceMarkers[i] = createMarker(loc, facilityVm.resource.Type);
              }           


              console.log(resourceMarkers);

              $timeout(function(){
                startAnimation(routeNum)
              }, 6000);  
            }
          } 
        }

        function createMarker(latlng, type) {
            var markerIcon;
            if(facilityVm.selectedFacility.Type == 'Hospital')
              markerIcon = "./img/ambulance.svg";
            else if(facilityVm.selectedFacility.Type == 'Police Station')
              markerIcon = "./img/police-car.svg";
            else if(facilityVm.selectedFacility.Type == "Fire Station")
              markerIcon = "./img/fire-truck.svg";
            var tempMarker = new google.maps.Marker({
                position: latlng,
                map: facilityVm.map,
                
                icon: markerIcon,
                animation: google.maps.Animation.DROP
                });

            return tempMarker;
        } 

        function startAnimation(index){
            eol[index] = polyline[index].Distance();

            poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)],
                  strokeColor:"#FFFF00", strokeWeight:3});
          
            animate(index, 50);
        }

        function animate(index,d) {
            markerStarted = true;
            current_point = d;
            if (d > eol[index]) {
                resourceMarkers[index].setPosition(endLocation[index].latlng);
                /** if vehicle arrived, count plus 1 */
                count++;
                return;
              }
              var p = polyline[index].GetPointAtDistance(d);

            // console.log(window.localStorage['updateLoc']);

            // var cp = angular.fromJson(window.localStorage['updateLoc']);
            // console.log(cp);
            resourceMarkers[index].setPosition(p);
            updatePoly(index,d);
            timerHandle[index] =  $timeout(function() {
                animate(index, (d + facilityVm.step*5 + index*0.2));
            }, tick);
        }

        function updatePoly(i,d) {
        /**
          Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
        */
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

       $interval(function updateGPS(){            
        // console.log(facilityVm.selectedFacility.id);
            $http({
                method  : 'POST',
                url     : '/singleEvent/UpdatedGPS',
                headers : { 'Content-Type': 'application/json' },
                data    : {
                            sim_id: facilityVm.simStatis.data.sim_id
                          }
            }).then(function success(response){
            

                /** update mobile resource real time location */
                for(var i = 0; i < resourceNum; ++i){
                    resourceMarkers[i].setPosition(response.data[0].location);
                }
            })
        }, 2000);
    });

});


