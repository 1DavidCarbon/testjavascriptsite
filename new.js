window.net=window.net||{};
net.imapbuilder=net.imapbuilder||{};
net.imapbuilder.gmap=net.imapbuilder.gmap||{};
if(typeof(net.imapbuilder.gmap.firstRun)==="undefined"){
	net.imapbuilder.gmap.firstRun=true; // this can only be initialized once or risk resetting
}


(function(){
	var maplink = window.location; 
	var g=net.imapbuilder.gmap; // shorten the code of the namespace object
	var objCount = 0;	// counter of objects
	var crowdsourcingActive=false;
	
	// map 
	var html = ''; 
	var map; 
	var map_geocoder;	
	var gdata;	// data from database
	var gtoolbarH = 40;	// toolbar height
	var gmapW = 700, gmapH = 500;	// map size
	var xhr=[]; // array of xhr, 
	var markerXhr=[];
	
	// objects
	var markers = [];
	var markerPath = '//static.edit.g.imapbuilder.net/images/markers/';
	var labels = [];
	var images = [];
	var polylines = [];
	var rectangles = [];
	var infowindow ; 
	var cacheGrid=[];
	var clusters=[];
	var clustering={};
	var categorylist=[];
	
	var tempGeo = [];
	// map style
	var mapThemeArr = [];
	mapThemeArr['default'] = [];
	mapThemeArr['dark'] = [{stylers: [{ invert_lightness: true }]}];
	mapThemeArr['bright'] = [{stylers: [{ lightness: 30 },{ gamma: 0.3 }]}];
	mapThemeArr['colorful'] = [{stylers: [{ saturation: 40 },{ lightness: -40 }]}];
	var mapStyleGeometryFillOff = {featureType: "administrative", elementType: "geometry.fill" ,stylers: [{ visibility: "off" }]};
	
	
	g.initialize=function(){
        console.log("g.initialize called");
		map_geocoder=new google.maps.Geocoder();
        //console.log(map_geocoder); // see if can detect Geocoder status
		
		// init map
		var mapOptions={
			zoom:gdata.data.zoom,
			center:new google.maps.LatLng(gdata.data.center[0],gdata.data.center[1]),
			mapTypeId:gdata.data.maptype,
			mapTypeControl:gdata.data.showmaptypecontrol,
			panControl:gdata.data.showpancontrol,
			scaleControl:gdata.data.showscalecontrol,
			streetViewControl:gdata.data.showstreetviewcontrol,
			zoomControl:gdata.data.showzoomcontrol,
			disableDoubleClickZoom:gdata.data.disabledoubleclickzoom,
			draggable:gdata.data.mapdraggable,
			keyboardShortcuts:gdata.data.enablekeyboardshortcuts,
			scrollwheel:gdata.data.enablescrollwheel
		};
		map=new google.maps.Map(document.getElementById('gmap_'+gdata.id),mapOptions);
        // console.log(map.getBounds()); // see if can detect map status
		map.setTilt(0);
		g.initOverlay(); // init overlay
		
		if(gdata.data.maptype == "custom"){
			g.loadImageMap(gdata.id);
		}else if(gdata.data.maptype == "styled" || gdata.data.styleenable){
			g.addMapStyle(map, g.getStyleArray(gdata.data.theme, gdata.data.style, gdata.data.stylename), gdata.data.stylename);
		}
		// load map object
		google.maps.event.addListener(map,"bounds_changed",function(){
            //console.log(map.getBounds()); // see if can detect map status - no difference in both version
            // even tiles are loaded
			objCount=0; // initialize / reset? the count is per tile..how to make it per load? try reset it on idle
														  
			/*if(gdata.id!=2605){
				g.loadMapData(); // this function need to be rewritten to fix bug and performance issues
			}else{*/
				g.refreshTile();
			/*}*/
			if(document.getElementById('searchbarInput')){
				document.getElementById('searchbarInput').blur();
			}
		});
		google.maps.event.addListener(map,"click",function(e){ // on production, may make it bounds_changed so it's more responsive
			if(document.getElementById('searchbarInput')){
				document.getElementById('searchbarInput').blur();
			}
			var title;
			var desc;
			var email;
			//console.log("mapclick");
			if(crowdsourcingActive){
				if(title=prompt("Enter Marker Title:")){
					if(desc=prompt("Enter marker description:")){
						if(email=prompt("Enter your email address:")){
							//console.log(title+" "+desc+" "+email);
							//console.log(e.latLng.lat()+","+e.latLng.lng());
							// call ajax to save the marker
							//g.ajax("POST","//live.edit.g.imapbuilder.net/refreshMap/",{"uid":gdata.user,"map":gdata.id,"categorylist":JSON.stringify(categorylist)},g.refreshMapOnLoad); // test
							g.ajax("POST","//live.view.g.imapbuilder.net/addCrowdsourcingMarker/",{map:gdata.id,lat:e.latLng.lat(),lng:e.latLng.lng(),email:email,title:title,desc:desc},g.refreshTile);
						}
					}
				}
				// collect email address, title, description
				// ajax to save the info
				// ask user to reload to see the markers, or auto refresh
				/*var title=prompt("Title for the marker:");*/
				/**/
			}
			crowdsourcingActive=false;
		});		
		// add category
		setTimeout(function(){
			if(gdata.data.category_enable == true){
				categorylist=gdata.categorylist;
				g.addCategory(gdata.categorylist, gdata.data.category_pos, gdata.data.category_bg, gdata.data.category_layout);
			}else{
				
			}
			
			if(gdata.data.showsearchcontrol == true){
				g.searchBarOnMap();
			}else{
				
			}
			
			// crowdsourcing 
			if(gdata.data.enablecrowdsourcing){
				g.crowdsourcingOnMap();
			}
			
			// show watermark when free account or when quota runs out
			if(plan == 0 || quota<=0)
				g.addGMapIconOnMap();
		},2000);
		// test code start
		//if(gdata.id==2605){
		//	alert("Test Map: "+gdata.id);
			// here loads the fixed one time objects
		g.refreshMap();
		//}
		/*setTimeout(function(){
			g.getScheduledMarker();
		}, 3000);*/
		//console.log("Test Code Loaded");
		(function(){
			var jobCount=0;
			var input;
			var output=[];
			function newXhr(){
				if(window.XMLHttpRequest){
					return new XMLHttpRequest();
				}else{
					return new ActiveXObject("Microsoft.XMLHTTP");
				}
			}
			function geocodeNext(){
				var geocoder=new google.maps.Geocoder();
				geocoder.geocode({"address":input.job[jobCount].geocodeAddr},function(results,status){
					if(status==google.maps.GeocoderStatus.OK){
						output.push({id:input.job[jobCount].id,lat:results[0].geometry.location.lat(),lng:results[0].geometry.location.lng()});
					}else{
						output.push({id:input.job[jobCount].id,error:status});
					}
					jobCount++;
					if(jobCount<input.job.length){ // still have jobs
						setTimeout(function(){geocodeNext();},1); // do next job
					}else{ // jobs finish
						var xhr=newXhr();
						xhr.open("POST","//live.view.g.imapbuilder.net/returnJob/",true);
						xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
						xhr.send("json="+encodeURI(JSON.stringify(output)));
					}
				});
			}
			var xhr=newXhr();
			xhr.onreadystatechange=function(){
				if(xhr.readyState==4&&xhr.status==200){
					input=JSON.parse(xhr.responseText);
					if(input.status=="ok"){
						if(input.job.length>0){
							setTimeout(function(){geocodeNext();},1);
						}
					}
				}
			}
			xhr.open("GET","//live.view.g.imapbuilder.net/getJob/",true);
			xhr.send();
		})();
		return;
		
	};
	g.loadImageMap=function(mapid){
		var customTypeOptions = {
		getTileUrl: function(coord, zoom) {
			var normalizedCoord = g.getNormalizedCoord(coord, zoom);
			var tilesCount = Math.pow(2, zoom);
			if (!normalizedCoord) {
			  return null;
			}
			if (coord.x >= tilesCount || coord.x < 0 || coord.y >= tilesCount || coord.y < 0) {
				return "//static.edit.g.imapbuilder.net/custom_img/imagemap_blank.png";
			}
			
			var bound = Math.pow(2, zoom);
			var filename = "//static.edit.g.imapbuilder.net/custom_img/uploads/"+mapid+"/" ;
			filename += zoom + "_" + normalizedCoord.x + "_" + (normalizedCoord.y) + ".png";
			//filename = "blank.png";
			return filename;
		},
		tileSize: new google.maps.Size(256, 256),
		maxZoom: 3,
		minZoom: 0,
		radius: 1738000,
		name: "Custom"
	  };
	
		var customMapType = new google.maps.ImageMapType(customTypeOptions);
		
		var sname = "Custom";
		map.setOptions({
			mapTypeControlOptions: {
				mapTypeIds: [sname]
			}
		});
		
		//Associate the styled map with the MapTypeId and set it to display.
		map.mapTypes.set(sname, customMapType);
		map.setMapTypeId(sname);
	}
	// Normalizes the coords that tiles repeat across the x axis (horizontally)
	// like the standard Google map tiles.
	g.getNormalizedCoord=function(coord, zoom) {
		var y = coord.y;
		var x = coord.x;
		
		// tile range in one direction range is dependent on zoom level
		// 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
		var tileRange = 1 << zoom;
		
		// don't repeat across y-axis (vertically)
		if (y < 0 || y >= tileRange) {
		  return null;
		}
		
		// repeat across x-axis
		if (x < 0 || x >= tileRange) {
		  x = (x % tileRange + tileRange) % tileRange;
		}
		
		return {
		  x: x,
		  y: y
		};
	}
	g.refreshMap=function(){
		// have category 
		if(gdata.data.category_enable == true){
			var catStr = '';
			for(var i=0; i<gdata.categorylist.length; i++){
				catStr += gdata.categorylist[i].startup;
			}
			g.ajax("POST","//live.edit.g.imapbuilder.net/refreshMap/",{"uid":gdata.user,"map":gdata.id,"categorylist":JSON.stringify(gdata.categorylist),"catStr": catStr},g.refreshMapOnLoad); // test
		}else{
			g.ajax("POST","//live.edit.g.imapbuilder.net/refreshMap/",{"uid":gdata.user,"map":gdata.id,"categorylist":JSON.stringify(categorylist)},g.refreshMapOnLoad); // test
		}
	}
	g.loadMapData=function(){
		g.clearMap();	// remove all object on map
		objCount = 0 ; 
		var zoom=map.getZoom();
		var sw=map.getBounds().getSouthWest(); // supposed min values
		var ne=map.getBounds().getNorthEast(); // supposed max values
		// latitude handling
		var latList=[];
		for(var a=g.lat2grid(zoom,sw.lat()); a<=g.lat2grid(zoom,ne.lat()); a++){
			latList.push(a);
		}
		// longitude handling
		var div=document.getElementById('gmap_'+gdata.id);
		var lngList=[];
		if(div.clientWidth<256*Math.pow(2,zoom)){
			var lngMin=g.lng2grid(zoom,sw.lng());
			var lngMax=g.lng2grid(zoom,ne.lng());
			if(lngMax>lngMin){
				for(var a=lngMin; a<=lngMax; a++){
					lngList.push(a);
				}
			}else{
				for(var a=0; a<=lngMax; a++){
					lngList.push(a);
				}
				for(var a=lngMin; a<Math.pow(2,zoom); a++){
					lngList.push(a);
				}
			}
		}else{
			for(var a=0; a<Math.pow(2,zoom); a++){
				lngList.push(a);
			}
		}
		// terminate existing ajax calls in prepare for new calls
		for(var a=0; a<xhr.length; a++){
			xhr[a].abort();
		}
		xhr=[];
		//debug(lngList);
		//debug(latList);
		
		// have category 
		
		if(gdata.data.category_enable == true){
			var catStr = '';
			for(var i=0; i<gdata.categorylist.length; i++){
				catStr += gdata.categorylist[i].startup;
			}
			// create 2D plane of GRID
			for(var x in lngList){
				for(var y in latList){
					var cachehit=false;
					if(cacheGrid[zoom]){
						if(cacheGrid[zoom][lngList[x]]){
							if(cacheGrid[zoom][lngList[x]][latList[y]]){
								if(cacheGrid[zoom][lngList[x]][latList[y]][catStr]){
									// cache exist
									cachehit=true;
								}
							}
						}
					}
					if(!cachehit){
						//requestGrid.push([lngList[x],latList[y]]);
						if(!cacheGrid[zoom]){
							cacheGrid[zoom]=[];
						}
						if(!cacheGrid[zoom][lngList[x]]){
							cacheGrid[zoom][lngList[x]]=[];
						}
						if(!cacheGrid[zoom][lngList[x]][latList[y]]){
							//alert(lngList[x]+";"+lngList[y]);
							cacheGrid[zoom][lngList[x]][latList[y]]=[]; // prepare cache space
						}
						if(!cacheGrid[zoom][lngList[x]][latList[y]][catStr]){
							cacheGrid[zoom][lngList[x]][latList[y]][catStr] = {};
							// now call ajax to get something from server
							// within this for loop is the batch of ajax to call this time, previously defined ajax can be cancelled first to improve performance
							g.ajax("POST","//live.edit.g.imapbuilder.net/getData/",{"uid": gdata.user , "map": gdata.id, "latId":latList[y], "lngId":lngList[x], "level":zoom, "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "categorylist": JSON.stringify(gdata.categorylist), "catStr": catStr},g.blackhole); // test
							// pay attention whether this is get or post
						}
					}else{
						if(cacheGrid[zoom][lngList[x]][latList[y]][catStr] != undefined){
							var cgMarkers = cacheGrid[zoom][lngList[x]][latList[y]][catStr].markers; 
							var cgCluster = cacheGrid[zoom][lngList[x]][latList[y]][catStr].cluster; 
							var cgLabels = cacheGrid[zoom][lngList[x]][latList[y]][catStr].labels;  
							var cgPolylines = cacheGrid[zoom][lngList[x]][latList[y]][catStr].polylines; 
							var cgRectangles = cacheGrid[zoom][lngList[x]][latList[y]][catStr].rectangles; 
							var cgGeographic = cacheGrid[zoom][lngList[x]][latList[y]][catStr].geographic; 
							if(cgMarkers != undefined){
								for(var i=0 ; i< cgMarkers.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									
									var markerInfo = cgMarkers[i];
									var pos = markerInfo.position;
									pos = pos.replace("POINT(", "");
									pos = pos.replace(")", "");
									var posArr = pos.split(" ");
									var options = {};
									options.dbid = markerInfo.id;
									options.icon = markerInfo.icon.replace('http://','//');
                                    // here we try to replace icon URL http:// as //
									options.title = markerInfo.title;
									options.description = markerInfo.content;
									options.data = JSON.parse(markerInfo.data);
									g.addMarker(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
									objCount++;
								}
							}else if(cgCluster != undefined){
								if(objCount >= objLimit && objLimit != -1)
									break;
								var pp = cgCluster.position;
								var pos = pp.replace("POINT(", "");
								pos = pos.replace(")", "");
								var ppArr = pos.split(" ");
								var newClustersId = clusters.length;
								clusters[newClustersId] = g.createCluster({}, new google.maps.LatLng(g.int2lat(ppArr[1]), g.int2lng(ppArr[0])), cgCluster.count, cgCluster.count);
								clusters[newClustersId].cid = newClustersId;
								clusters[newClustersId].x = lngList[x];
								clusters[newClustersId].y = latList[y];
								clusters[newClustersId].z = zoom;
								google.maps.event.addListener(clusters[newClustersId],'click',function(){
									if(gdata.data.mcclick == "zoom"){	// zoom
										g.clusterZoomIn(this.cid);
									}else if(gdata.data.mcclick == "list"){	// list
										// get all markers in clustering
										g.ajax("POST","//live.edit.g.imapbuilder.net/getClusterList/",{"uid": gdata.user , "map": gdata.id, "latId":clusters[this.cid].y, "lngId":clusters[this.cid].x, "level":clusters[this.cid].z, "center":[clusters[this.cid].getCenter().lat(), clusters[this.cid].getCenter().lng()], "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "cid": this.cid},g.showClusterList); // test
									}
								});
								objCount++;
							}
							
							if(cgLabels != undefined){
								for(var i=0 ; i< cgLabels.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var labelInfo = cgLabels[i];
									var pos = labelInfo.position;
									pos = pos.replace("POINT(", "");
									pos = pos.replace(")", "");
									var posArr = pos.split(" ");
									var options = {};
									options.title = labelInfo.title;
									options.content = labelInfo.content;
									options.data = JSON.parse(labelInfo.data);
									options.border = options.data.sw;
									options.borderColor = options.data.sc;
									options.fontColor = options.data.fontcolor;
									options.fontSize = options.data.fontsize;
									options.background = options.data.fillcolor;
									options.width = options.data.maxwidth;	
									options.visible = true;
									options.clickable = true;	
									options.mouseover = true;
									options.opacity = options.data.opacity;
									options.map = map;
									options.padding = 3;
									options.info = options.data.info;	
									options.position = new google.maps.LatLng(g.int2lat(posArr[1]),g.int2lng(posArr[0]));
									g.addLabel(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
									
									objCount++;
								}
							}
							if(cgPolylines != undefined){
								for(var i=0 ; i< cgPolylines.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var polylineInfo = cgPolylines[i];
									var path = polylineInfo.path;
									path = path.replace("LINESTRING(", "");
									path = path.replace(")", "");
									var pathArr = path.split(",");
									var options = {};
									options.title = polylineInfo.title;
									options.content = polylineInfo.content;
									options.data = JSON.parse(polylineInfo.data);
									options.strokeWeight = options.data.sw;
									options.strokeColor = options.data.sc;
									options.strokeOpacity = options.data.so;
									options.geodesic = options.data.gd;
									options.clickable = true;	
									options.info = options.data.info;
									options.map = map;
									options.padding = 3;
									
									var p = new google.maps.MVCArray();
									for(var j = 0; j< pathArr.length; j++){
										var latlng = pathArr[j].split(" ");
										p.push(new google.maps.LatLng(g.int2lat(latlng[0]), g.int2lng(latlng[1])) );
									}
									g.addPolyline(polylineInfo.id, p, options);
									
									objCount++;
								}
							}
							
							if(cgRectangles != undefined){
								for(var i=0 ; i< cgRectangles.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var rectangleInfo = cgRectangles[i];
									var path = rectangleInfo.path;
									path = path.replace("POLYGON((", "");
									path = path.replace("))", "");
									var pathArr = path.split(",");
									var northEast = pathArr[0];
									var southWest = pathArr[2];
									
									northEast = northEast.split(" ");
									southWest = southWest.split(" ");
									var ne = new google.maps.LatLng(g.int2lat(northEast[0]), g.int2lng(northEast[1])) ;
									var sw = new google.maps.LatLng(g.int2lat(southWest[0]), g.int2lng(southWest[1])) ;
									
									var options = {};
									options.title = rectangleInfo.title;
									options.content = rectangleInfo.content;
									options.data = JSON.parse(rectangleInfo.data);
									options.strokeWeight = options.data.sw;
									options.strokeColor = options.data.sc;
									options.strokeOpacity = options.data.so;
									options.fillColor = options.data.fc;
									options.fillOpacity = options.data.fo;
									options.clickable = true;	
									options.info = options.data.info;
									options.map = map;
									options.padding = 3;
									g.addRectangle(rectangleInfo.id, ne, sw, options);
									
									objCount++;
								}
							}
												
							if(cgGeographic != undefined){
								for(var i=0 ; i< cgGeographic.length; i++){
									var geoInfo = cgGeographic[i]; 
									if(tempGeo[geoInfo.gid] == undefined)
										tempGeo[geoInfo.gid] = {};	
									if(tempGeo[geoInfo.gid][geoInfo.pid] == undefined)
										tempGeo[geoInfo.gid][geoInfo.pid] = {};	
									tempGeo[geoInfo.gid][geoInfo.pid] = {'data':geoInfo.data, 'title':geoInfo.title, 'description':geoInfo.description};
								}
								for(var tg in tempGeo){
									// create 2D plane of GRID
									g.ajaxGeographic("GET","tile/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall,zoom,tg,true);
									// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
								}
								
								for(var tg in tempGeo){
									// get related grids
									g.ajaxGeographic("GET","related/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall2,zoom, tg,true);
									// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
								}
							
							}
							/*
							if(cacheGrid[zoom][lngList[x]][lngList[y]].points < clustering.options.minMarkers ) {
								if(cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata != undefined){
									for(var i=0; i<cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata.length; i++){
										var pp = cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata[i].pos;
										var ppArr = pp.split(" ");
										//POINT(1098907648 3461704684)
										addMarker(int2lat(ppArr[1]), int2lng(ppArr[0]));
									}
								}
							}else{
								if(cacheGrid[zoom][lngList[x]][lngList[y]].cluster != undefined){
									var cl = cacheGrid[zoom][lngList[x]][lngList[y]].cluster;
									var pp = cl.pos;
									var ppArr = pp.split(" ");
									clusters[clusters.length] = createCluster({}, new google.maps.LatLng(int2lat(ppArr[1]), int2lng(ppArr[0])), cl.count, cl.count);
								}
							}
							*/
						}
					}
				}
			}
			// remove / hide out of bound GRID's drawings
		}else{
			// create 2D plane of GRID
			for(var x in lngList){
				for(var y in latList){
					var cachehit=false;
					if(cacheGrid[zoom]){
						if(cacheGrid[zoom][lngList[x]]){
							if(cacheGrid[zoom][lngList[x]][latList[y]]){
								// cache exist
								cachehit=true;
							}
						}
					}
					if(!cachehit){
						//requestGrid.push([lngList[x],latList[y]]);
						if(!cacheGrid[zoom]){
							cacheGrid[zoom]=[];
						}
						if(!cacheGrid[zoom][lngList[x]]){
							cacheGrid[zoom][lngList[x]]=[];
						}
						if(!cacheGrid[zoom][lngList[x]][latList[y]]){
							//alert(lngList[x]+";"+lngList[y]);
							cacheGrid[zoom][lngList[x]][latList[y]]={}; // prepare cache space
							// now call ajax to get something from server
							// within this for loop is the batch of ajax to call this time, previously defined ajax can be cancelled first to improve performance
							g.ajax("POST","//live.edit.g.imapbuilder.net/getData/",{"uid": gdata.user , "map": gdata.id, "latId":latList[y], "lngId":lngList[x], "level":zoom, "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "categorylist": JSON.stringify(categorylist)},g.blackhole); // test
							// pay attention whether this is get or post
						}
					}else{
						if(cacheGrid[zoom][lngList[x]][latList[y]] != undefined){
							var cgMarkers = cacheGrid[zoom][lngList[x]][latList[y]].markers; 
							var cgCluster = cacheGrid[zoom][lngList[x]][latList[y]].cluster; 
							var cgLabels = cacheGrid[zoom][lngList[x]][latList[y]].labels; 
							var cgPolylines = cacheGrid[zoom][lngList[x]][latList[y]].polylines; 
							var cgRectangles = cacheGrid[zoom][lngList[x]][latList[y]].rectangles; 
							if(cgMarkers != undefined){
								for(var i=0 ; i< cgMarkers.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var markerInfo = cgMarkers[i];
									var pos = markerInfo.position;
									pos = pos.replace("POINT(", "");
									pos = pos.replace(")", "");
									var posArr = pos.split(" ");
									var options = {};
									options.dbid = markerInfo.id;
									if(!isNaN()){
										options.icon = markerPath+markerInfo.icon.replace('http://','//'); 
									}else{
										options.icon = markerInfo.icon.replace('http://','//'); 
									}
									options.title = markerInfo.title;
									options.description = markerInfo.content;
									options.data = JSON.parse(markerInfo.data);
									g.addMarker(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
									
									objCount ++;
								}
							}else if(cgCluster != undefined){
								if(objCount >= objLimit && objLimit != -1)
										break;
								var pp = cgCluster.position;
								var pos = pp.replace("POINT(", "");
								pos = pos.replace(")", "");
								var ppArr = pos.split(" ");
								var newClustersId = clusters.length;
								clusters[newClustersId] = g.createCluster({}, new google.maps.LatLng(g.int2lat(ppArr[1]), g.int2lng(ppArr[0])), cgCluster.count, cgCluster.count);
								clusters[newClustersId].cid = newClustersId;
								clusters[newClustersId].x = lngList[x];
								clusters[newClustersId].y = latList[y];
								clusters[newClustersId].z = zoom;
								google.maps.event.addListener(clusters[newClustersId],'click',function(){
									if(gdata.data.mcclick == "zoom"){	// zoom
										g.clusterZoomIn(this.cid);
									}else if(gdata.data.mcclick == "list"){	// list
										// get all markers in clustering
										g.ajax("POST","//live.edit.g.imapbuilder.net/getClusterList/",{"uid": gdata.user , "map": gdata.id, "latId":clusters[this.cid].y, "lngId":clusters[this.cid].x, "level":clusters[this.cid].z, "center":[clusters[this.cid].getCenter().lat(), clusters[this.cid].getCenter().lng()], "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "cid": this.cid},g.showClusterList); // test
									}
									
								});
								objCount ++;
							}
							
							if(cgLabels != undefined){
								for(var i=0 ; i< cgLabels.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var labelInfo = cgLabels[i];
									var pos = labelInfo.position;
									pos = pos.replace("POINT(", "");
									pos = pos.replace(")", "");
									var posArr = pos.split(" ");
									var options = {};
									options.title = labelInfo.title;
									options.content = labelInfo.content;
									options.data = JSON.parse(labelInfo.data);
									options.border = options.data.sw;
									options.borderColor = options.data.sc;
									options.fontColor = options.data.fontcolor;
									options.fontSize = options.data.fontsize;
									options.background = options.data.fillcolor;
									options.width = options.data.maxwidth;	
									options.visible = true;
									options.clickable = true;	
									options.mouseover = true;
									options.opacity = options.data.opacity;
									options.map = map;
									options.padding = 3;
									options.info = options.data.info;	
									options.position = new google.maps.LatLng(g.int2lat(posArr[1]),g.int2lng(posArr[0]));
									g.addLabel(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
									objCount ++;
								}
							}
							if(cgPolylines != undefined){
								for(var i=0 ; i< cgPolylines.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var polylineInfo = cgPolylines[i];
									var path = polylineInfo.path;
									path = path.replace("LINESTRING(", "");
									path = path.replace(")", "");
									var pathArr = path.split(",");
									var options = {};
									options.title = polylineInfo.title;
									options.content = polylineInfo.content;
									options.data = JSON.parse(polylineInfo.data);
									options.strokeWeight = options.data.sw;
									options.strokeColor = options.data.sc;
									options.strokeOpacity = options.data.so;
									options.geodesic = options.data.gd;
									options.clickable = true;	
									options.info = options.data.info;
									options.map = map;
									options.padding = 3;
									
									var p = new google.maps.MVCArray();
									for(var j = 0; j< pathArr.length; j++){
										var latlng = pathArr[j].split(" ");
										p.push(new google.maps.LatLng(g.int2lat(latlng[0]), g.int2lng(latlng[1])) );
									}
									g.addPolyline(polylineInfo.id, p, options);
									objCount++;
								}
							}
							if(cgRectangles != undefined){
								for(var i=0 ; i< cgRectangles.length; i++){
									if(objCount >= objLimit && objLimit != -1)
										break;
									var rectangleInfo = cgRectangles[i];
									var path = rectangleInfo.path;
									path = path.replace("POLYGON((", "");
									path = path.replace("))", "");
									var pathArr = path.split(",");
									var northEast = pathArr[0];
									var southWest = pathArr[2];
									
									northEast = northEast.split(" ");
									southWest = southWest.split(" ");
									var ne = new google.maps.LatLng(g.int2lat(northEast[0]), g.int2lng(northEast[1])) ;
									var sw = new google.maps.LatLng(g.int2lat(southWest[0]), g.int2lng(southWest[1])) ;
									
									var options = {};
									options.title = rectangleInfo.title;
									options.content = rectangleInfo.content;
									options.data = JSON.parse(rectangleInfo.data);
									options.strokeWeight = options.data.sw;
									options.strokeColor = options.data.sc;
									options.strokeOpacity = options.data.so;
									options.fillColor = options.data.fc;
									options.fillOpacity = options.data.fo;
									options.clickable = true;	
									options.info = options.data.info;
									options.map = map;
									options.padding = 3;
									g.addRectangle(rectangleInfo.id, ne, sw, options);
									objCount ++;
								}
							}
											
							if(cgGeographic != undefined){
								for(var i=0 ; i< cgGeographic.length; i++){
									var geoInfo = cgGeographic[i]; 
									if(tempGeo[geoInfo.gid] == undefined)
										tempGeo[geoInfo.gid] = {};	
									if(tempGeo[geoInfo.gid][geoInfo.pid] == undefined)
										tempGeo[geoInfo.gid][geoInfo.pid] = {};	
									tempGeo[geoInfo.gid][geoInfo.pid] = {'data':geoInfo.data, 'title':geoInfo.title, 'description':geoInfo.description};
								}
								for(var tg in tempGeo){
									// create 2D plane of GRID
									g.ajaxGeographic("GET","tile/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall,zoom,tg,true);
									// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
								}
								
								for(var tg in tempGeo){
									// get related grids
									g.ajaxGeographic("GET","related/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall2,zoom,tg,true);
									// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
								}
							
							}
							/*
							if(cacheGrid[zoom][lngList[x]][lngList[y]].points < clustering.options.minMarkers ) {
								if(cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata != undefined){
									for(var i=0; i<cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata.length; i++){
										var pp = cacheGrid[zoom][lngList[x]][lngList[y]].pointsdata[i].pos;
										var ppArr = pp.split(" ");
										//POINT(1098907648 3461704684)
										addMarker(int2lat(ppArr[1]), int2lng(ppArr[0]));
									}
								}
							}else{
								if(cacheGrid[zoom][lngList[x]][lngList[y]].cluster != undefined){
									var cl = cacheGrid[zoom][lngList[x]][lngList[y]].cluster;
									var pp = cl.pos;
									var ppArr = pp.split(" ");
									clusters[clusters.length] = createCluster({}, new google.maps.LatLng(int2lat(ppArr[1]), int2lng(ppArr[0])), cl.count, cl.count);
								}
							}
							*/
						}
					}
				}
			}
			// remove / hide out of bound GRID's drawings
		}
		
		
	}
	g.run=function(mapdata){
		/*console.log("g.run");
		console.log(net.imapbuilder.gmap.firstRun);
		console.log(mapdata);*/
		// try work around double load issue
		var isFirstRun=false;
		if(net.imapbuilder.gmap.firstRun){
			net.imapbuilder.gmap.firstRun=false;
			isFirstRun=true;
			// add css style
			g.addStyle('//static.view.g.imapbuilder.net/_api/map.css');
			// add jquery 
			g.addStyle('//static.edit.g.imapbuilder.net/css/ui-lightness/jquery-ui-1.8.23.custom.css');
			g.addScript('//static.edit.g.imapbuilder.net/js/jquery-1.8.2.min.js');
			g.addScript('//static.edit.g.imapbuilder.net/js/jquery-ui-1.8.23.custom.min.js');

			// add logics here to prevent double loading of google map API, run net.imapbuilder.gmap.initialize directly at the end of this function
			// add google map api script
            g.addScript('//maps.google.com/maps/api/js?key='+mapkey+'&callback=net.imapbuilder.gmap.initialize&libraries=geometry');
		}
		
		// no map data
		if(mapdata == undefined){
			html='<div id="mapContainer" style="height: 100px; width: 100px; background: #CCC"></div>';
			document.write(html);
			return; 
		}
		//gdata=JSON.parse(mapdata);
		gdata=mapdata;
		// no map data
		if(gdata.data == undefined){
			html='<div id="mapContainer" style="height: 100px; width: 100px; background: #CCC"></div>';
			document.write(html);
			return; 
		}
		// map data
		gdata.data=JSON.parse(gdata.data);
		gdata.categorylist=JSON.parse(gdata.categorylist);
		
		// change page title
		document.title = gdata.filename; 
		html='<div id="mapContainer" style="height: 100%; width: 100%">';
		// no markers list
		if(gdata.data.mlshow=="none"){
			// main map
			html+='<div id="gmap_'+gdata.id+'"></div>'+
				'<div id="gmap_list"></div>'+
				'<div id="crowdbox"></div>';
				
			html+='<div class="gClearBoth"></div>'; // suspected extra div close here, removed one
		}else{ // add markers list
			if(gdata.data.mlpos=="top"||gdata.data.mlpos=="left"){
				// main map
				html+='<div id="gmap_list"></div>'+
					'<div id="gmap_'+gdata.id+'"></div>'+
					'<div id="crowdbox"></div>';
			}else if(gdata.data.mlpos=="bottom"||gdata.data.mlpos=="right"){
				// main map
				html+='<div id="gmap_'+gdata.id+'"></div>'+
					'<div id="gmap_list"></div>'+
					'<div id="crowdbox"></div>';
			}		
		}
		html+='<div class="gClearBoth"></div></div>';
		document.write(html);
		
		if(gdata.data.mlshow=="none"){
			document.getElementById('gmap_list').style.display="none";
		}else{
			document.getElementById('gmap_list').style.border="1px solid #CCCCCC";
			// markers list size
			if(gdata.data.mlpos=="left"){
				document.getElementById('gmap_list').className+="gFloatLeft";
				document.getElementById('gmap_'+gdata.id).className+="gFloatLeft";
			}else if(gdata.data.mlpos=="right"){
				document.getElementById('gmap_list').className+="gFloatLeft";
				document.getElementById('gmap_'+gdata.id).className+="gFloatLeft";
			}
			document.getElementById('gmap_list').style.height=(gdata.data.mlheight-22)+"px";
			document.getElementById('gmap_list').style.width=(gdata.data.mlwidth-22)+"px";
		}
		
		if(size == "full"){
			if (document.body && document.body.offsetWidth) {
				gmapW = document.body.offsetWidth;
				gmapH = document.body.offsetHeight;
			}
			if (document.compatMode=='CSS1Compat' &&
				document.documentElement &&
				document.documentElement.offsetWidth ) {
				gmapW = document.documentElement.offsetWidth;
				gmapH = document.documentElement.offsetHeight;
			}
			if (window.innerWidth && window.innerHeight) {
				gmapW = window.innerWidth;
				gmapH = window.innerHeight;
			}
			
		}else{
			gmapW = gdata.data.width;
			gmapH = gdata.data.height;
		}
		// if have toolbar
		// toolbar size
		if( document.getElementById('gbar') != undefined){
			document.getElementById('gbar_mapname').innerHTML = gdata.filename;
			//document.getElementById('facebookLikebtn').innerHTML = '<div class="fb-like" data-href="'+maplink+'" data-send="false" data-layout="button_count" data-width="450" data-show-faces="false" data-font="arial"></div> ';
			if(gdata.data.mlshow!="none"&& (gdata.data.mlpos=="left"||gdata.data.mlpos=="right")){
				document.getElementById('gbar').style.width = (gmapW+gdata.data.mlwidth-2)+"px";
				document.getElementById('mapContainer').style.width = (gmapW+gdata.data.mlwidth)+"px";
			}else{
				document.getElementById('gbar').style.width = (gmapW-2)+"px";
			}
			document.getElementById('gbar').style.height = gtoolbarH+"px";
			//setTimeout(function(){document.getElementById('gbar').style.display = "block";},1000);
			document.getElementById('gbar').style.display = "block";
		}
		// map size
		if(size == "full"){
			if(gdata.data.mlshow!="none"&& (gdata.data.mlpos=="right"||gdata.data.mlpos=="left") ){
				var fullwidth = (gmapW-(gdata.data.mlwidth+2) ); 
				document.getElementById('gmap_'+gdata.id).style.width = fullwidth+"px";
				document.getElementById('gbar').style.width = (gmapW-2)+"px";
				document.getElementById('mapContainer').style.width = (gmapW-2)+"px";
				document.getElementById('gmap_'+gdata.id).style.height = (gmapH - 120) + "px";
			}else{
				document.getElementById('gmap_'+gdata.id).style.width = (gmapW-2) + "px";
				document.getElementById('gmap_'+gdata.id).style.height = (gmapH - 120) + "px";		
			}
		}else{
			if(document.getElementById('gbar')){ // bug fix of uninitialized object
				document.getElementById('gbar').style.width = (gmapW-2)+"px";
			}
			if(gmapW=="100%")
				document.getElementById('gmap_'+gdata.id).style.width = "100%";
			else
				document.getElementById('gmap_'+gdata.id).style.width = gmapW+"px";
			if(gmapH=="100%")
				document.getElementById('gmap_'+gdata.id).style.height = "100%";
			else
				document.getElementById('gmap_'+gdata.id).style.height = gmapH+"px";
		}
		
		// try work around double load issue
		if(!isFirstRun){
			net.imapbuilder.gmap.initialize();
		}

	};
	// combined theme and style
	g.getStyleArray=function(theme, style, name){
		var t = [];
		var s = [];
		var styleArr = [];
		if(theme != "default"){
			t = mapThemeArr[theme];
			if(t != undefined){
				for(var i=0; i< t.length; i++){
					styleArr.push(t[i]);
				}
			}
		}
		
		if(style != "default"){
			s = style;
			if(s != undefined){
				for(var i=0; i< s.length; i++){
					styleArr.push(s[i]);
				}
			}
		}
		return styleArr;
	}
	// add style in map
	g.addMapStyle=function(m, style, sname){
		if(style == undefined || style.length <= 0)
			return;
		
		style.push(mapStyleGeometryFillOff);
		
		// Create a new StyledMapType object, passing it the array of styles,
		var styledMap = new google.maps.StyledMapType(style,{name: sname});
		
		var mapOptions = {
			mapTypeControlOptions: {
				mapTypeIds: [google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN, sname]
			},
			mapTypeId: sname
		};
		m.setOptions(mapOptions);
		
		//Associate the styled map with the MapTypeId and set it to display.
		m.mapTypes.set(sname, styledMap);
		m.setMapTypeId(sname);
	}
	// ajax function
	g.ajax=function(method,url,obj,callback){
		var id=xhr.length;
		if(window.XDomainRequest){
			xhr[id]=new XDomainRequest;
			xhr[id].onload=function(){
				callback(this.responseText);
			}
			xhr[id].open(method,url);
		}else{
			xhr[id]=new XMLHttpRequest;
			xhr[id].onreadystatechange=function(){
				if(this.readyState==4&&this.status==200){
					callback(this.responseText);
				}
			}
			xhr[id].open(method,url);
			if(method=="POST"){
				xhr[id].setRequestHeader("Content-type","application/x-www-form-urlencoded");
			}
		}
		xhr[id].send("json="+encodeURIComponent(JSON.stringify(obj)));
	}
	
	// add stylesheet
	g.addStyle=function(cssPath){
		//<link rel="stylesheet" type="text/css" href="css/tooltip.css" />
		var style=document.createElement('link');
		style.rel="stylesheet";
		style.type="text/css";
		style.href=cssPath;
		document.body.appendChild(style);
	}
	// add javascript 
	g.addScript=function(jsPath){
		var script=document.createElement('script');
		script.src=jsPath;
		script.type='text/javascript';
		document.body.appendChild(script);
	}
	
	/* Overlay */
	g.initOverlay=function(){
		// Define the overlay, derived from google.maps.OverlayView
		g.Overlay=function(options, latlng, content) {
		  // Initialization
			this.setValues(options);
			this.latLng_ = latlng;
			this.content_ = content;
			this.options_ = options; 
			
			// Overlay specific
			var span = this.span_ = document.createElement('div');
			span.style.cssText = 'position: relative;' +
								'text-align: center;';
		
			
			if(this.options_.border != undefined)
				span.style.cssText+='border: '+this.options_.border+'px solid '+this.options_.borderColor+'; ';
			if(this.options_.background != undefined)
				span.style.cssText+='background: '+this.options_.background+' no-repeat;';						
			if(this.options_.fontColor != undefined)
				span.style.cssText+='color: '+this.options_.fontColor+';';
			if(this.options_.fontSize != undefined)
				span.style.cssText+='font-size: '+this.options_.fontSize+'px;';
			if(this.options_.width >0){
				span.style.cssText+= 'width: '+ this.options_.width + 'px;';
			}else{
				span.style.cssText+= 'width: auto;';
			}
			if(this.options_.opacity != undefined ) 
				span.style.cssText+= 'opacity: '+ this.options_.opacity + ';';
			if(this.options_.lineHeight != undefined )
				span.style.cssText+= 'line-height: '+ this.options_.lineHeight + ';';	
			if(this.options_.padding != undefined )
				span.style.cssText+= 'padding: '+ this.options_.padding + 'px;';	
			if(this.options_.marginLeft != undefined)
				span.style.cssText+= 'margin-left: '+ this.options_.marginLeft;	
			if(this.options_.marginTop != undefined)
				span.style.cssText+= 'margin-top: '+ this.options_.marginTop;	
			var div = this.div_ = document.createElement('div');
			div.appendChild(span);
			div.style.cssText = 'position: absolute; display: none';
		};
			
		g.Overlay.prototype = new google.maps.OverlayView();
		
		// Implement onAdd
		g.Overlay.prototype.onAdd = function() {
			var pane = this.getPanes().overlayImage;
			pane.appendChild(this.div_);
			
			var me = this;
			// Ensures the label is redrawn if the text or position is changed.
			this.listeners_ = [
				google.maps.event.addDomListener(this.div_, 'click', function() { 
					if (me.options_.clickable) {
						google.maps.event.trigger(me, 'click');
					}
				})
				,google.maps.event.addDomListener(this.div_, 'mouseover', function() { 
					if (me.options_.mouseover) {
						google.maps.event.trigger(me, 'mouseover');
					}
				})
			];
		};
		
		// Implement onRemove
		g.Overlay.prototype.onRemove = function() {
			if(this.div_ != undefined)
				this.div_.parentNode.removeChild(this.div_);
				
			// Overlay is removed from the map, stop updating its position/text.
			for (var i = 0, I = this.listeners_.length; i < I; ++i) {
				google.maps.event.removeListener(this.listeners_[i]);
			}
		};
		
		// Implement draw
		g.Overlay.prototype.draw = function() {
		  var projection = this.getProjection();
		  if( projection )
			var position = projection.fromLatLngToDivPixel(this.latLng_);
		
			this.span_.style.cssText = 'position: relative;' +
								'text-align: center; ';
		
			
			if(this.options_.border != undefined)
				this.span_.style.cssText+='border: '+this.options_.border+'px solid '+this.options_.borderColor+'; ';
			if(this.options_.background != undefined)
				this.span_.style.cssText+='background: '+this.options_.background+' no-repeat;';						
			if(this.options_.fontColor != undefined)
				this.span_.style.cssText+='color: '+this.options_.fontColor+';';
			if(this.options_.fontSize != undefined)
				this.span_.style.cssText+='font-size: '+this.options_.fontSize+'px;';
			if(this.options_.width > 0){
				this.span_.style.cssText+= 'width: '+ this.options_.width + 'px;';
			}else{
				this.span_.style.cssText+= 'width: auto;';
			}
			if(this.options_.opacity != undefined ) 
				this.span_.style.cssText+= 'opacity: '+ this.options_.opacity + ';';
			if(this.options_.lineHeight != undefined )
				this.span_.style.cssText+= 'line-height: '+ this.options_.lineHeight + ';';	
			if(this.options_.padding != undefined )
				this.span_.style.cssText+= 'padding: '+ this.options_.padding + ';';	
			if(this.options_.marginLeft != undefined)
				this.span_.style.cssText += 'margin-left: '+ this.options_.marginLeft;	
			if(this.options_.marginTop != undefined)
				this.span_.style.cssText += 'margin-top: '+ this.options_.marginTop;	
				
		  //this.span_.innerHTML = this.content_;
		
		  if(this.options_.type=="image"){
			  // first need to erase previous element
			  while( this.span_.hasChildNodes()){
				 this.span_.removeChild(this.span_.lastChild);
			  }
			 // here use dom to create img object with onload event to add negative margin
			  var img=document.createElement("img");
			  img.src=this.content_;
			  img.onload=function(){
				  this.style.marginLeft="-"+this.clientWidth/2+"px";
				  this.style.marginTop="-"+this.clientHeight/2+"px";
			  }
			  this.span_.appendChild(img);
		  }else{
			  this.span_.innerHTML = this.content_;
		  }

		var div = this.div_;
		  if( position ){
			  div.style.left = position.x+'px';
			  div.style.top = position.y+'px';
		  }
		
		
		  var visible = this.options_.visible;
		  div.style.display = visible ? 'block' : 'none';
		
			var clickable = this.options_.clickable;
		  this.span_.style.cursor = clickable ? 'pointer' : '';
		
		
		  var zIndex = this.options_.zIndex;
		  div.style.zIndex = zIndex;
		
		};
		
		g.Overlay.prototype.redraw = function(force) {
			this.draw();
		}
		
		g.Overlay.prototype.getPosition = function() {
			return this.latLng_;
		}
		
		g.Overlay.prototype.getClickable = function() {
			return this.options_.clickable;
		}
		
		/* Overlay properties */
		g.Overlay.prototype.setProperties = function(option, value){
			if(option == "content"){
				/*if(this.options_.type == "image")
					this.content_ = '<img src="'+value+'" />';
				else*/
					this.content_ = value;
			}else if(option == "visible")
				this.options_.visible = value;
			else if(option == "clickable")
				this.options_.clickable = value;
			else if(option == "zIndex")
				this.options_.zIndex = value;
			else if(option == "border")
				this.options_.border = value;
			else if(option == "bordercolor")
				this.options_.borderColor = value;
			else if(option == "background")
				this.options_.background = value;
			else if(option == "fontcolor")
				this.options_.fontColor = value;
			else if(option == "fontsize")
				this.options_.fontSize = value;
			else if(option == "width")
				this.options_.width = value;
			else if(option == "opacity")
				this.options_.opacity = value;
			this.redraw();
		}
		
		g.Overlay.prototype.getCenter = function(){
			return this.latLng_; 
		}
	}
	/* end of overlay */
	
	/* add category */
	
	var categoryPosition = [];
	categoryPosition[1] = ["left", "top", "0", "0"];
	categoryPosition[2] = ["left", "top", "40%", "0" ];
	categoryPosition[3] = ["right", "top", "0", "0"];
	categoryPosition[4] = ["left", "top", "0", "40%"];
	categoryPosition[5] = ["left", "top", "40%", "40%"];
	categoryPosition[6] = ["right", "top", "0", "50%"];
	categoryPosition[7] = ["left", "bottom", "0", "30px"];
	categoryPosition[8] = ["left", "bottom", "40%", "30px"];
	categoryPosition[9] = ["right", "bottom", "0", "30px"];
	categoryPosition[10] = ["left", "top", "80px", "50px"]; // top left when have map control
	categoryPosition[11] = ["left", "top", "80px", "40%"]; // middle left when have map control
	categoryPosition[12] = ["left", "top", "0px", "50px"]; // top left when havent map control
	categoryPosition[13] = ["left", "top", "0px", "40%"]; // middle left when havent map control
	categoryPosition[14] = ["left", "top", "5px", "0"]; // top left when havent map control
	categoryPosition[15] = ["left", "top", "5px", "40%"]; // middle left when havent map control
	
	g.addCategory=function(categoryList, pos, bgColor, layout){
		if(layout == "inside"){
			var map_div = document.getElementById('gmap_'+gdata.id);
			var categoryDiv = document.createElement('div');
			categoryDiv.id = "categoryDiv";
			categoryDiv.style.backgroundColor = bgColor;
			categoryDiv.style.position="absolute";
			categoryDiv.style.padding="10px";
			categoryDiv.style.margin="5px";
			categoryDiv.style.border="1px solid #666";
		
			if(!gdata.data.showpancontrol && !gdata.data.showscalecontrol && !gdata.data.showstreetviewcontrol && !gdata.data.showzoomcontrol && gdata.data.showsearchcontrol){
				if(pos == 1) // top left when have not map control but search bar
					pos = 12;	
				if(pos == 4) // middle left when have not map control but search bar
					pos = 13;
			}else if(!gdata.data.showpancontrol && !gdata.data.showscalecontrol && !gdata.data.showstreetviewcontrol && !gdata.data.showzoomcontrol && !gdata.data.showsearchcontrol){
				if(pos == 1) // top left when have not map control
					pos = 14;	
				if(pos == 4) // middle left when have not map control
					pos = 15;
			}else if(gdata.data.showpancontrol || gdata.data.showscalecontrol || gdata.data.showstreetviewcontrol || gdata.data.showzoomcontrol|| gdata.data.showsearchcontrol){
				if(pos == 1) // top left when have map control
					pos = 10;	
				if(pos == 4) // middle left when have map control
					pos = 11;
			}
			
			if(categoryPosition[pos][0] == "left" )
				categoryDiv.style.left= categoryPosition[pos][2];
			if(categoryPosition[pos][0] == "right" )
				categoryDiv.style.right= categoryPosition[pos][2];
			if(categoryPosition[pos][1] == "top" )
				categoryDiv.style.top= categoryPosition[pos][3];
			if(categoryPosition[pos][1] == "bottom" )
				categoryDiv.style.bottom= categoryPosition[pos][3];
				
			var html = '';
			var checked = '';
			for(var i=0; i< categoryList.length; i++){
				checked = '';
				if(categoryList[i].startup == true)
					checked = 'checked="checked"';
				html += '<input type="checkbox" id="cateogry_'+categoryList[i].id+'" onclick="net.imapbuilder.gmap.clickCategory();" value="'+categoryList[i].id+'" '+checked+' /><label id="cateogry_'+categoryList[i].id+'_label"  for="cateogry_'+categoryList[i].id+'"> '+categoryList[i].name+'</label><br/>';
			}
			categoryDiv.innerHTML=html;
			map_div.appendChild(categoryDiv);
		}else if(layout == "outside"){
			var map_div = document.getElementById('mapContainer');
			var categoryDiv = document.createElement('div');
			categoryDiv.id = "categoryDiv";
			categoryDiv.style.backgroundColor = bgColor;
			categoryDiv.style.padding="5px";
			categoryDiv.style.border="1px solid #666";
			
			if(size == "full"){
				if(gdata.data.mlshow!="none"&& (gdata.data.mlpos=="right"||gdata.data.mlpos=="left") ){
					categoryDiv.style.width = (gmapW-12)+"px";
				}
			}else{
				if(gdata.data.mlshow!="none"){
					if(gdata.data.mlpos=="left"||gdata.data.mlpos=="right"){		
						categoryDiv.style.width = (gmapW+gdata.data.mlwidth-12)+"px";
					}else{
						categoryDiv.style.width = (gmapW-12)+"px";
					}
				}else{
					categoryDiv.style.width = (gmapW-12)+"px";
				}
			}
			if( gdata.data.showmaptypecontrol || gdata.data.showpancontrol || gdata.data.showscalecontrol || gdata.data.showstreetviewcontrol || gdata.data.showzoomcontrol){
				if(pos == 1) // top left when have map control
					pos = 10;	
				if(pos == 4) // middle left when have map control
					pos = 11;
			}
			
			if(categoryPosition[pos][0] == "left" )
				categoryDiv.style.left= categoryPosition[pos][2];
			if(categoryPosition[pos][0] == "right" )
				categoryDiv.style.right= categoryPosition[pos][2];
			if(categoryPosition[pos][1] == "top" )
				categoryDiv.style.top= categoryPosition[pos][3];
			if(categoryPosition[pos][1] == "bottom" )
				categoryDiv.style.bottom= categoryPosition[pos][3];
				
			var html = '';
			var checked = '';
			for(var i=0; i< categoryList.length; i++){
				checked = '';
				if(categoryList[i].startup == true)
					checked = 'checked="checked"';
				html += '<input type="checkbox" id="cateogry_'+categoryList[i].id+'" onclick="net.imapbuilder.gmap.clickCategory();" value="'+categoryList[i].id+'" '+checked+' /><label id="cateogry_'+categoryList[i].id+'_label"  for="cateogry_'+categoryList[i].id+'"> '+categoryList[i].name+'</label>&nbsp;&nbsp;';
			}
			categoryDiv.innerHTML=html;
			map_div.appendChild(categoryDiv);
		}
	};
	g.clickCategory=function(){
		// check category
		gdata.categorylist = [];
		var catArr = {};
		var allCategoryInput = document.getElementById('categoryDiv').getElementsByTagName('input');
		for(var i=0; i<allCategoryInput.length; i++){
			catArr = {};
			catArr.id=allCategoryInput[i].value;
			catArr.map=gdata.id;
			catArr.message=document.getElementById(allCategoryInput[i].id+'_label').innerHTML;
			if(allCategoryInput[i].checked)
				catArr.startup=1;
			else			
				catArr.startup=0;
			gdata.categorylist.push(catArr);
		}
		// load map data again
		//net.imapbuilder.gmap.loadMapData(); // this seems old function, try to use refresh tile?
		g.refreshTile();
	};
	/* end of category */
	
	/* markers */
	g.addMarker=function(lat, lng, options){
		//console.log("g.addMarker"); // addMarker is called 1 for each marker...removing list won't work here.
		//console.log(options);
		var mid = markers.length; 
		markers[mid] = new google.maps.Marker({
									icon: g.getMarkerIcon(options.icon), 
									title: options.title,
									map: map,
									position:new google.maps.LatLng(lat, lng),
                                    optimized: false
								});				
		//show info window
			if(options.data.info == "click"){
				google.maps.event.addListener(markers[mid],'click',function(){
					if(options.description != "" || options.title!=""){
						g.closeInfoWindow();
						infowindow = new google.maps.InfoWindow();
						var infocontent = "<strong>"+options.title+"</strong><br/>"+options.description; 
						if(quota<=0 || plan==0){
							infocontent+="<br /><br /><a href=\"https://www.imapbuilder.net/\">Powered by iMapBuilder</a>";
						}
						if(options.data.maxwidth==0){
							infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng)});
						}else{
							infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng),maxWidth:options.data.maxwidth});
						}
						//console.log(options.data.maxwidth);
						infowindow.open(map);
					}
					if(options.data.url != "" && options.data.url != "http://" && options.data.url != "https://"){
						if(options.data.urltarget == "_blank")
							window.open(options.data.url, "_blank");
						else if(options.data.urltarget == "_self")
							window.open(options.data.url, "_self");
					}
					
				});
			}else if(options.data.info == "over"){			
				google.maps.event.addListener(markers[mid],'mouseover',function(){
					// console.log("1402 mouseover listener function called");
					if(options.description != "" || options.title!=""){
						g.closeInfoWindow();
						infowindow = new google.maps.InfoWindow();
						var infocontent = "<strong>"+options.title+"</strong><br/>"+options.description; 
						if(options.data.maxwidth==0){
							infowindow.setOptions({content:infocontent});
						}else{
							infowindow.setOptions({content:infocontent,maxWidth:options.data.maxwidth});
						}
						infowindow.open(map,markers[mid]);
						google.maps.event.addListener(markers[mid],'mouseout',function(){
							console.log("1414 mouseout listener function called");
							google.maps.event.clearListeners(this,'mouseout');
							g.closeInfoWindow();
						});
					}
				});
			}
		
		// show in markers list
		var markerIconSrc = options.icon;
		if( !isNaN(markerIconSrc) ){
			markerIconSrc=markerPath+markerIconSrc;
		}
		
		var markerContentDiv = document.createElement('div');
		markerContentDiv.id=mid;
		markerContentDiv.dbid=options.dbid;
		markerContentDiv.className='markerListItem';
		//markerContentDiv.style.height='30px'; // this is not needed
		markerContentDiv.style.padding='4px 0';
		markerContentDiv.onclick=function(){
			net.imapbuilder.gmap.toogleMarker(this.id);
			//alert(this.dbid);
		}
		var markerIcon = document.createElement('img');
		markerIcon.src = markerIconSrc;
		//markerIcon.align = 'left'; // this is not needed
		markerIcon.height = '28'; // this is still needed
		markerContentDiv.appendChild(markerIcon);
		
		var markerTitle = document.createElement('span');
		markerTitle.innerHTML = '&nbsp;'+options.title;
		markerContentDiv.appendChild(markerTitle);
		
		// determine proper position for inserting to gmap_list
		if(document.getElementById('gmap_list').children.length==0){
			document.getElementById('gmap_list').appendChild(markerContentDiv);
		}else{
			// determine where to insert
			//var inserted=false;
			for(var cid=0; cid<document.getElementById('gmap_list').children.length; cid++){
				//console.log(document.getElementById('gmap_list').children[cid].dbid);
				if(options.dbid<document.getElementById('gmap_list').children[cid].dbid){
					break;
				}
			}
			if(cid<document.getElementById('gmap_list').children.length){
				document.getElementById('gmap_list').insertBefore(markerContentDiv,document.getElementById('gmap_list').children[cid]);
			}else{
				document.getElementById('gmap_list').appendChild(markerContentDiv);	 // insert as last element if bigger than everyone
			}
		}
	}
	g.toogleMarker=function(mid){
		 google.maps.event.trigger(markers[mid], 'click');
	}
	/* end of marker */
	
	/* label */
	g.addLabel=function(lat, lng, options){
		var lid = labels.length;
		labels[lid] = new g.Overlay(options, new google.maps.LatLng(lat, lng), options.title);
		
		if(options.info == "click"){
			google.maps.event.addListener(labels[lid], 'click', function(){
				if(options.content != ""){
					g.closeInfoWindow();
					infowindow = new google.maps.InfoWindow();
					var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
					infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng)});
					infowindow.open(map);
				}
				if(options.data.url != "" && options.data.url != "http://" && options.data.url != "https://"){
					if(options.data.urltarget == "_blank")
						window.open(options.data.url, "_blank");
					else if(options.data.urltarget == "_self")
						window.open(options.data.url, "_self");
				}
			});
		}else if(options.info == "over"){
			google.maps.event.addListener(labels[lid], 'mouseover', function(){
				g.closeInfoWindow();
				infowindow = new google.maps.InfoWindow();
				var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
				infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng)});
				infowindow.open(map);
				
				google.maps.event.addListener(labels[lid],'mouseout',function(){
					g.closeInfoWindow();
				});	
			});
		}
		
	}
	/* end of label*/

	/* image */
	g.addImage=function(lat, lng, options){
		var lid = images.length;
		options.type="image";
		images[lid] = new g.Overlay(options, new google.maps.LatLng(lat, lng), options.title);
		
		if(options.info == "click"){
			google.maps.event.addListener(images[lid], 'click', function(){
				if(options.content != ""){
					g.closeInfoWindow();
					infowindow = new google.maps.InfoWindow();
					var infocontent = options.content; 
					infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng)});
					infowindow.open(map);
				}
				if(options.data.url != "" && options.data.url != "http://" && options.data.url != "https://"){
					if(options.data.urltarget == "_blank")
						window.open(options.data.url, "_blank");
					else if(options.data.urltarget == "_self")
						window.open(options.data.url, "_self");
				}
			});
		}else if(options.info == "over"){
			google.maps.event.addListener(images[lid], 'mouseover', function(){
				g.closeInfoWindow();
				infowindow = new google.maps.InfoWindow();
				var infocontent = options.content; 
				infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(lat, lng)});
				infowindow.open(map);
				
				google.maps.event.addListener(images[lid],'mouseout',function(){
					g.closeInfoWindow();
				});	
			});
		}
		
	}
	/* end of image*/
	
	
	/* Polyline */
	g.addPolyline=function(id, path, options){
		for(var p=0; p< polylines.length; p++){
			if(polylines[p].dbid == id){
				return;
			}
		}
		var pid = polylines.length;
		polylines[pid]=new google.maps.Polyline(options);
		polylines[pid].setPath(path);
		polylines[pid].dbid = id;
		if(options.info == "click"){
			google.maps.event.addListener(polylines[pid], 'click', function(event){
				if(options.content != ""){
					g.closeInfoWindow();
					infowindow = new google.maps.InfoWindow();
					var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
					infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())});
					infowindow.open(map);
				}
				if(options.data.url != "" && options.data.url != "http://" && options.data.url != "https://"){
					if(options.data.urltarget == "_blank")
						window.open(options.data.url, "_blank");
					else if(options.data.urltarget == "_self")
						window.open(options.data.url, "_self");
				}
			});
		}else if(options.info == "over"){
			google.maps.event.addListener(polylines[pid], 'mouseover', function(event){
				g.closeInfoWindow();
				infowindow = new google.maps.InfoWindow();
				var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
				infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())});
				infowindow.open(map);
				
				google.maps.event.addListener(polylines[pid],'mouseout',function(){
					g.closeInfoWindow();
				});	
			});
		}
	}
	/* end of Polyline*/
	
	g.addRectangle=function(id, ne, sw, options){
		for(var p=0; p< rectangles.length; p++){
			if(rectangles[p].dbid == id){
				return;
			}
		}
		var rid = rectangles.length;
		rectangles[rid]=new google.maps.Rectangle(options);
		rectangles[rid].setBounds(new google.maps.LatLngBounds(sw, ne));
		rectangles[rid].dbid = id;
		if(options.info == "click"){
			google.maps.event.addListener(rectangles[rid], 'click', function(event){
				if(options.content != ""){
					g.closeInfoWindow();
					infowindow = new google.maps.InfoWindow();
					var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
					infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())});
					infowindow.open(map);
				}
				if(options.data.url != "" && options.data.url != "http://" && options.data.url != "https://"){
					if(options.data.urltarget == "_blank")
						window.open(options.data.url, "_blank");
					else if(options.data.urltarget == "_self")
						window.open(options.data.url, "_self");
				}
			});
		}else if(options.info == "over"){
			google.maps.event.addListener(rectangles[rid], 'mouseover', function(event){
				g.closeInfoWindow();
				infowindow = new google.maps.InfoWindow();
				var infocontent = "<strong>"+options.title+"</strong><br/>"+options.content; 
				infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())});
				infowindow.open(map);
				
				google.maps.event.addListener(rectangles[rid],'mouseout',function(){
					g.closeInfoWindow();
				});	
			});
		}
	}
	g.refreshTile=function(){
		// stop previous unfinished gxhr calls
		for(var a=0; a<gxhr.length; a++){
			gxhr[a].abort();
		}
		gxhr=[];
		// marker
		for(var a=0; a<markerXhr.length; a++){
			markerXhr[a].abort();
		}
		markerXhr=[];
		// clear all markers
		for(var i=0; i<markers.length; i++){
			if(markers[i] != undefined){
				google.maps.event.clearListeners(markers[i], 'click');
				markers[i].setMap(null);
			}
		}
		markers = [];
		// clear clusters
		for(var i=0; i< clusters.length; i++){
			if(clusters[i] != undefined){
				google.maps.event.clearListeners(clusters[i], 'click');
				clusters[i].setMap(null);
			}
		}
		clusters = [];
		

		// determine current tiles ID
		var zoom=map.getZoom();
		var sw=map.getBounds().getSouthWest(); // supposed min values
		var ne=map.getBounds().getNorthEast(); // supposed max values
		// latitude handling
		var latList=[];
		for(var a=g.lat2grid(zoom,sw.lat()); a<=g.lat2grid(zoom,ne.lat()); a++){
			latList.push(a);
		}
		// longitude handling
		var div=document.getElementById('gmap_'+gdata.id);
		var lngList=[];
		if(div.clientWidth<256*Math.pow(2,zoom)){
			var lngMin=g.lng2grid(zoom,sw.lng());
			var lngMax=g.lng2grid(zoom,ne.lng());
			if(lngMax>lngMin){
				for(var a=lngMin; a<=lngMax; a++){
					lngList.push(a);
				}
			}else{
				for(var a=0; a<=lngMax; a++){
					lngList.push(a);
				}
				for(var a=lngMin; a<Math.pow(2,zoom); a++){
					lngList.push(a);
				}
			}
		}else{
			for(var a=0; a<Math.pow(2,zoom); a++){
				lngList.push(a);
			}
		}
		// prepare ajax requests
		// 20140305 here is the add marker loop with addMarker call
		// TODO: clear the marker list first
		//document.getElementById('gmap_list').appendChild(markerContentDiv);
		var gmaplist=document.getElementById('gmap_list');
		while(gmaplist.hasChildNodes()){
			gmaplist.removeChild(gmaplist.lastChild);
		}
		
		for(var x in lngList){
			for(var y in latList){
				for(var tg in tempGeo){
					g.ajaxGeographic("GET","tile/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall,zoom,tg,true);
					g.ajaxGeographic("GET","related/"+tg+"/"+zoom+"/"+lngList[x]+"/"+latList[y],g.geographicCall2,zoom,tg,true);
				}
				//g.ajaxMarker("POST","refreshMarker2/",{"map":gdata.id,"latId":latList[y],"lngId":lngList[x],"level":zoom,"mcgridsize":gdata.data.mcgridsize,"mcmaxzoom":gdata.data.mcmaxzoom,"mcenabled":gdata.data.mcenabled,"categorylist":JSON.stringify({})});
				// "categorylist":JSON.stringify(gdata.categorylist)
				g.ajaxMarker("POST","refreshMarker2/",{"map":gdata.id,"latId":latList[y],"lngId":lngList[x],"level":zoom,"mcgridsize":gdata.data.mcgridsize,"mcmaxzoom":gdata.data.mcmaxzoom,"mcenabled":gdata.data.mcenabled,"categorylist":JSON.stringify(gdata.categorylist)});
				// fixed for issue 201304250925
			}
		}
		
	}
	g.ajaxMarker=function(method,url,obj){
		var id=markerXhr.length;
		if(method=="POST"){
			url="//live.edit.g.imapbuilder.net/"+url;
		}
		if(window.XDomainRequest){
			markerXhr[id]=new XDomainRequest;
			markerXhr[id].onload=function(){
				g.refreshMarkerOnLoad2(this.responseText);
			}
			markerXhr[id].open(method,url);
		}else{
			markerXhr[id]=new XMLHttpRequest;
			markerXhr[id].onreadystatechange=function(){
				if(this.readyState==4&&this.status==200){
					g.refreshMarkerOnLoad2(this.responseText);
				}
			}
			markerXhr[id].open(method,url);
			if(method=="POST"){
				markerXhr[id].setRequestHeader("Content-type","application/x-www-form-urlencoded");
			}
		}
		markerXhr[id].send("json="+encodeURIComponent(JSON.stringify(obj)));
	}
	
	g.refreshMapOnLoad=function(response){
		var json=JSON.parse(response);
		
		// load geographic region config to memory
		if(json.geographic!= undefined){
			tempGeo = [];
			for(var i=0 ; i< json.geographic.length; i++){
				var geoInfo = json.geographic[i];
				if(tempGeo[geoInfo.gid] == undefined)
					tempGeo[geoInfo.gid] = {};	
				if(tempGeo[geoInfo.gid][geoInfo.pid] == undefined)
					tempGeo[geoInfo.gid][geoInfo.pid] = {};	
				if(geoInfo.data != undefined && geoInfo.data != null){
					tempGeo[geoInfo.gid][geoInfo.pid] = {'data':geoInfo.data, 'title':geoInfo.title, 'description':geoInfo.description};
				}else{
					tempGeo[geoInfo.gid][geoInfo.pid] = null;
				}
			}
		}
		
		if(json.labels != undefined){
			var cgLabels = json.labels; 
			for(var i=0 ; i< cgLabels.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var labelInfo = cgLabels[i];
				var pos = labelInfo.position;
				pos = pos.replace("POINT(", "");
				pos = pos.replace(")", "");
				var posArr = pos.split(" ");
				var options = {};
				options.title = labelInfo.title;
				options.content = labelInfo.content;
				options.data = JSON.parse(labelInfo.data);
				options.border = options.data.sw;
				options.borderColor = options.data.sc;
				options.fontColor = options.data.fontcolor;
				options.fontSize = options.data.fontsize;
				options.background = options.data.fillcolor;
				options.width = options.data.maxwidth;	
				options.visible = true;
				options.clickable = true;	
				options.mouseover = true;
				options.info = options.data.info;
				options.opacity = options.data.opacity;
				options.map = map;
				options.padding = 3;
				options.position = new google.maps.LatLng(g.int2lat(posArr[1]),g.int2lng(posArr[0]));
				g.addLabel(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
				objCount++;
			}
		}

		if(json.images != undefined){
			//console.log(json.images);
			var cgImages = json.images; 
			for(var i=0 ; i< cgImages.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var imageInfo = cgImages[i];
				var pos = imageInfo.position;
				pos = pos.replace("POINT(", "");
				pos = pos.replace(")", "");
				var posArr = pos.split(" ");
				var options = {};
				options.title = imageInfo.title;
				options.content = imageInfo.content;
				options.data = JSON.parse(imageInfo.data);
				/*options.border = options.data.sw;
				options.borderColor = options.data.sc;
				options.fontColor = options.data.fontcolor;
				options.fontSize = options.data.fontsize;
				options.background = options.data.fillcolor;
				options.width = options.data.maxwidth;	*/
				options.visible = true;
				options.clickable = true;	
				options.mouseover = true;
				options.info = options.data.info;
				options.opacity = options.data.opacity;
				options.map = map;
				/*options.padding = 3;*/
				options.position = new google.maps.LatLng(g.int2lat(posArr[1]),g.int2lng(posArr[0]));
				//g.addLabel(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
				g.addImage(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
				objCount++;
			}
		}
		
		if(json.polylines != undefined){
			var cgPolylines = json.polylines; 
			for(var i=0 ; i< cgPolylines.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var polylineInfo = cgPolylines[i];
				var path = polylineInfo.path;
				path = path.replace("LINESTRING(", "");
				path = path.replace(")", "");
				var pathArr = path.split(",");
				var options = {};
				options.zIndex=200;
				options.title = polylineInfo.title;
				options.content = polylineInfo.content;
				options.data = JSON.parse(polylineInfo.data);
				options.strokeWeight = options.data.sw;
				options.strokeColor = options.data.sc;
				options.strokeOpacity = options.data.so;
				options.geodesic = options.data.gd;
				options.clickable = true;	
				options.info = options.data.info;
				options.map = map;
				options.padding = 3;
				var p = new google.maps.MVCArray();
				for(var j = 0; j< pathArr.length; j++){
					var latlng = pathArr[j].split(" ");
					p.push(new google.maps.LatLng(g.int2lat(latlng[0]), g.int2lng(latlng[1])) );
				}
				g.addPolyline(polylineInfo.id, p, options);
				objCount ++;
			}
		}
		
		if(json.rectangles != undefined){
			var cgRectangles = json.rectangles; 
			for(var i=0 ; i< cgRectangles.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var rectangleInfo = cgRectangles[i];
				var path = rectangleInfo.path;
				path = path.replace("POLYGON((", "");
				path = path.replace("))", "");
				var pathArr = path.split(",");
				var northEast = pathArr[0];
				var southWest = pathArr[2];
				
				northEast = northEast.split(" ");
				southWest = southWest.split(" ");
				var ne = new google.maps.LatLng(g.int2lat(northEast[0]), g.int2lng(northEast[1])) ;
				var sw = new google.maps.LatLng(g.int2lat(southWest[0]), g.int2lng(southWest[1])) ;
				
				var options={};
				options.zIndex=100;
				options.title = rectangleInfo.title;
				options.content = rectangleInfo.content;
				options.data = JSON.parse(rectangleInfo.data);
				console.log("got 1 json.rectangles");
				console.log(options.data);
				options.strokeWeight = options.data.sw;
				options.strokeColor = options.data.sc;
				options.strokeOpacity = options.data.so;
				options.fillColor = options.data.fc;
				options.fillOpacity = options.data.fo;
				options.clickable = true;	
				options.info = options.data.info;
				options.map = map;
				options.padding = 3;
				g.addRectangle(rectangleInfo.id, ne, sw, options);
				
				objCount ++;
			}
		}
		g.refreshTile();
		return;
	}
	
	g.refreshMarkerOnLoad2=function(response){
		var json=JSON.parse(response);
		/*if(json.cat){
			// have category
			cacheGrid[json.z][json.x][json.y][json.cat]={};
			cacheGrid[json.z][json.x][json.y][json.cat]=json;
		}else{
			cacheGrid[json.z][json.x][json.y]={};
			cacheGrid[json.z][json.x][json.y]=json;
		}*/
		if(json.markers != undefined){
			
			for(var i=0 ; i< json.markers.length; i++){
				if(objCount >= objLimit && objLimit != -1)
					break;
				var markerInfo = json.markers[i];
				var options = {};
				options.dbid = markerInfo.id;
				options.icon = markerInfo.icon.replace('http://','//'); 
				options.title = markerInfo.title;
				options.description = markerInfo.content;
				options.data = JSON.parse(markerInfo.data);
				g.addMarker(g.int2lat(markerInfo.lat), g.int2lng(markerInfo.lng), options);
				objCount ++;
			}
		}else if(json.cluster != undefined){
			if(objCount >= objLimit && objLimit != -1){
			}else{
				var newClustersId = clusters.length; 
				clusters[newClustersId] = g.createCluster({}, new google.maps.LatLng(g.int2lat(json.cluster.lat), g.int2lng(json.cluster.lng)), json.cluster.count, json.cluster.count);
				clusters[newClustersId].cid = newClustersId;
				clusters[newClustersId].x = json.x;
				clusters[newClustersId].y = json.y;
				clusters[newClustersId].z = json.z;
				google.maps.event.addListener(clusters[newClustersId],'click',function(){
					if(gdata.data.mcclick == "zoom"){	// zoom
						g.clusterZoomIn(this.cid);
					}else if(gdata.data.mcclick == "list"){	// list
						// get all markers in clustering
						g.ajax("POST","//live.edit.g.imapbuilder.net/getClusterList/",{"uid": gdata.user , "map": gdata.id, "latId":clusters[this.cid].y, "lngId":clusters[this.cid].x, "level":clusters[this.cid].z, "center":[clusters[this.cid].getCenter().lat(), clusters[this.cid].getCenter().lng()], "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "cid": this.cid},g.showClusterList); // test
					}
					
				});	
				objCount++;
			}
		}
		return;
	}
	/* blackhole */
	g.blackhole=function(response){ // shouldnot we use a proper name for this function?
		var json=JSON.parse(response);
		if(json.cat){
			// have category
			cacheGrid[json.z][json.x][json.y][json.cat]={};
			cacheGrid[json.z][json.x][json.y][json.cat]=json;
		}else{
			cacheGrid[json.z][json.x][json.y]={};
			cacheGrid[json.z][json.x][json.y]=json;
		}
		if(json.markers != undefined){
			for(var i=0 ; i< json.markers.length; i++){
				if(objCount >= objLimit && objLimit != -1)
					break;
				var markerInfo = json.markers[i];
				/*var pos = markerInfo.position;
				pos = pos.replace("POINT(", "");
				pos = pos.replace(")", "");
				var posArr = pos.split(" ");*/
				var options = {};
				options.dbid = markerInfo.id;
				options.icon = markerInfo.icon.replace('http://','//'); 
				options.title = markerInfo.title;
				options.description = markerInfo.content;
				options.data = JSON.parse(markerInfo.data);
				
				g.addMarker(g.int2lat(markerInfo.lat), g.int2lng(markerInfo.lng), options);
				
				objCount ++;
			}
		}else if(json.cluster != undefined){
			if(objCount >= objLimit && objLimit != -1){
			}else{
				/*var pp = json.cluster.position;
				var pos = pp.replace("POINT(", "");
				pos = pos.replace(")", "");
				var ppArr = pos.split(" ");*/
				var newClustersId = clusters.length; 
				clusters[newClustersId] = g.createCluster({}, new google.maps.LatLng(g.int2lat(json.cluster.lat), g.int2lng(json.cluster.lng)), json.cluster.count, json.cluster.count);
				clusters[newClustersId].cid = newClustersId;
				clusters[newClustersId].x = json.x;
				clusters[newClustersId].y = json.y;
				clusters[newClustersId].z = json.z;
				google.maps.event.addListener(clusters[newClustersId],'click',function(){
					if(gdata.data.mcclick == "zoom"){	// zoom
						g.clusterZoomIn(this.cid);
					}else if(gdata.data.mcclick == "list"){	// list
						// get all markers in clustering
						g.ajax("POST","//live.edit.g.imapbuilder.net/getClusterList/",{"uid": gdata.user , "map": gdata.id, "latId":clusters[this.cid].y, "lngId":clusters[this.cid].x, "level":clusters[this.cid].z, "center":[clusters[this.cid].getCenter().lat(), clusters[this.cid].getCenter().lng()], "mcgridsize": gdata.data.mcgridsize, "mcmaxzoom": gdata.data.mcmaxzoom, "mcenabled": gdata.data.mcenabled, "cid": this.cid},g.showClusterList); // test
					}
					
				});	
				objCount++;
			}
		}
		
		if(json.labels != undefined){
			var cgLabels = json.labels; 
			for(var i=0 ; i< cgLabels.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var labelInfo = cgLabels[i];
				var pos = labelInfo.position;
				pos = pos.replace("POINT(", "");
				pos = pos.replace(")", "");
				var posArr = pos.split(" ");
				var options = {};
				options.title = labelInfo.title;
				options.content = labelInfo.content;
				options.data = JSON.parse(labelInfo.data);
				options.border = options.data.sw;
				options.borderColor = options.data.sc;
				options.fontColor = options.data.fontcolor;
				options.fontSize = options.data.fontsize;
				options.background = options.data.fillcolor;
				options.width = options.data.maxwidth;	
				options.visible = true;
				options.clickable = true;	
				options.mouseover = true;
				options.info = options.data.info;
				options.opacity = options.data.opacity;
				options.map = map;
				options.padding = 3;
				options.position = new google.maps.LatLng(g.int2lat(posArr[1]),g.int2lng(posArr[0]));
				g.addLabel(g.int2lat(posArr[1]), g.int2lng(posArr[0]), options);
				objCount++;
			}
		}
		
		if(json.polylines != undefined){
			var cgPolylines = json.polylines; 
			for(var i=0 ; i< cgPolylines.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var polylineInfo = cgPolylines[i];
				var path = polylineInfo.path;
				path = path.replace("LINESTRING(", "");
				path = path.replace(")", "");
				var pathArr = path.split(",");
				var options = {};
				options.title = polylineInfo.title;
				options.content = polylineInfo.content;
				options.data = JSON.parse(polylineInfo.data);
				options.strokeWeight = options.data.sw;
				options.strokeColor = options.data.sc;
				options.strokeOpacity = options.data.so;
				options.geodesic = options.data.gd;
				options.clickable = true;	
				options.info = options.data.info;
				options.map = map;
				options.padding = 3;
				var p = new google.maps.MVCArray();
				for(var j = 0; j< pathArr.length; j++){
					var latlng = pathArr[j].split(" ");
					p.push(new google.maps.LatLng(g.int2lat(latlng[0]), g.int2lng(latlng[1])) );
				}
				g.addPolyline(polylineInfo.id, p, options);
				objCount ++;
			}
		}
		

		if(json.rectangles != undefined){
			var cgRectangles = json.rectangles; 
			for(var i=0 ; i< cgRectangles.length; i++){
				if(objCount >= objLimit && objLimit != -1)
				break;
				var rectangleInfo = cgRectangles[i];
				var path = rectangleInfo.path;
				path = path.replace("POLYGON((", "");
				path = path.replace("))", "");
				var pathArr = path.split(",");
				var northEast = pathArr[0];
				var southWest = pathArr[2];
				
				northEast = northEast.split(" ");
				southWest = southWest.split(" ");
				var ne = new google.maps.LatLng(g.int2lat(northEast[0]), g.int2lng(northEast[1])) ;
				var sw = new google.maps.LatLng(g.int2lat(southWest[0]), g.int2lng(southWest[1])) ;
				
				var options = {};
				options.title = rectangleInfo.title;
				options.content = rectangleInfo.content;
				options.data = JSON.parse(rectangleInfo.data);
				options.strokeWeight = options.data.sw;
				options.strokeColor = options.data.sc;
				options.strokeOpacity = options.data.so;
				options.fillColor = options.data.fc;
				options.fillOpacity = options.data.fo;
				options.clickable = true;	
				options.info = options.data.info;
				options.map = map;
				options.padding = 3;
				g.addRectangle(rectangleInfo.id, ne, sw, options);
				
				objCount ++;
			}
		}
		
		if(json.geographic != undefined){
			for(var i=0 ; i< json.geographic.length; i++){
				var geoInfo = json.geographic[i]; 
				if(tempGeo[geoInfo.gid] == undefined)
					tempGeo[geoInfo.gid] = {};	
				if(tempGeo[geoInfo.gid][geoInfo.pid] == undefined)
					tempGeo[geoInfo.gid][geoInfo.pid] = {};	
				tempGeo[geoInfo.gid][geoInfo.pid] = {'data':geoInfo.data, 'title':geoInfo.title, 'description':geoInfo.description};
			}
			for(var tg in tempGeo){
				// create 2D plane of GRID
				g.ajaxGeographic("GET","tile/"+tg+"/"+json.z+"/"+json.x+"/"+json.y,g.geographicCall,json.z,tg,true);
				// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
			}
			
			for(var tg in tempGeo){
				// get related grids
				g.ajaxGeographic("GET","related/"+tg+"/"+json.z+"/"+json.x+"/"+json.y,g.geographicCall2,json.z,tg,true);
				// call a related tile service to get the paths of related tiles, then handle here to see what tiles to fetch (if not already in the request list)
			}
		
		}
		/*
		if(json.points != undefined){
			if(json.points < clustering.options.minMarkers){
				// store cache
				cacheGrid[json.z][json.x][json.y]=json;
				if(json.pointsdata != undefined){
					for(var i=0; i<json.pointsdata.length; i++){
						var pp = json.pointsdata[i].pos;
						var ppArr = pp.split(" ");
						g.addMarker(int2lat(ppArr[1]), int2lng(ppArr[0]));
					}
				}
			}else{
				// store cache
				cacheGrid[json.z][json.x][json.y]=json;
				if(json.cluster != undefined){
					var pp = json.cluster.pos;
					var ppArr = pp.split(" ");
					clusters[clusters.length] = g.createCluster({}, new google.maps.LatLng(int2lat(ppArr[1]), g.int2lng(ppArr[0])), json.cluster.count, json.cluster.count);
				}
			}
		}
		*/
		//alert("x: "+json.x+"; y:"+json.y+"; z:"+json.z+"; points:"+json.points);
		return;
	}
	
	var clusterListData;
	var clusterListDataCount = 0; 
	var clusterListMore = "<div><a href='javascript:;' onclick='net.imapbuilder.gmap.showClusterListData()'>more...</a></div>"; 
	g.showClusterList=function(responseText){
		clusterListData = null;
		clusterListDataCount = 0; 
		var json=JSON.parse(responseText);
		g.closeInfoWindow();
		infowindow = new google.maps.InfoWindow();
		clusterListData = json.markers;
		var infocontent = "<div class='clusterTotal'>Total: "+ clusterListData.length +"<div class='clusterZoom'><img src='//static.view.g.imapbuilder.net/images/btn_zoom.png' onclick='net.imapbuilder.gmap.clusterZoomIn("+json.cid+")' title='Zoom In'/></div></div>"; 
		infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(json.center[0], json.center[1])});
		infowindow.open(map);
		g.showClusterListData();
	}
	g.clusterZoomIn=function(cid){
		g.closeInfoWindow();
		map.setCenter( clusters[cid].getCenter() );
		map.setZoom( (map.getZoom()+1) );
	}
	g.showClusterListData=function(){
		var infoContent="";
		var hasMore = true;
		var clusterCount = clusterListDataCount;
		for(var i = clusterCount; i<clusterCount+10; i++){
			if(clusterListData[i]!= undefined){
				var markerIconSrc=clusterListData[i].icon;
				if( !isNaN(markerIconSrc) ){
					markerIconSrc=markerPath+markerIconSrc;
				}
				infoContent += "<div class='clusterListItem'><img src='"+markerIconSrc+"' height='20px' align='left' />"+clusterListData[i].title+"</div>";
			}else{
				hasMore = false
				break;
			}
			clusterListDataCount++;
		}
		if(hasMore) 
			infoContent += clusterListMore;
		var iwContent = infowindow.getContent();
		iwContent=iwContent.replace(clusterListMore, "");
		iwContent+= infoContent;
		infowindow.setContent(iwContent);
	}
	
	g.closeInfoWindow=function(){
		if(infowindow != undefined ){
			infowindow.close();
		}
	}
	// for clustering
	g.createCluster=function(options, latlng, content, noOfMarkers){
		var options = {};
		if(noOfMarkers >= 1000){
			options.background = 'url("//static.view.g.imapbuilder.net/images/clustering/m5.png")';
			options.width = 92;
			options.lineHeight = '88px';
			options.fontSize = 13;
			options.marginLeft = "-46px";
			options.marginTop = "-44px";
		}else if(noOfMarkers >= 500){
			options.background = 'url("//static.view.g.imapbuilder.net/images/clustering/m4.png")';
			options.width = 80;
			options.lineHeight = '80px';
			options.fontSize = 12;
			options.marginLeft = "-40px";
			options.marginTop = "-40px";
		}else if(noOfMarkers >= 250){
			options.background = 'url("//static.view.g.imapbuilder.net/images/clustering/m3.png")';
			options.width = 66;
			options.lineHeight = '66px';
			options.fontSize = 12;
			options.marginLeft = "-33px";
			options.marginTop = "-33px";
		}else if(noOfMarkers >= 100){
			options.background = 'url("//static.view.g.imapbuilder.net/images/clustering/m2.png")';	
			options.width = 56;
			options.lineHeight = '56px';		
			options.fontSize = 11;
			options.marginLeft = "-28px";
			options.marginTop = "-28px";		
		}else{
			options.background = 'url("//static.view.g.imapbuilder.net/images/clustering/m1.png")';
			options.width = 52;
			options.lineHeight = '52px';
			options.fontSize = 11;
			options.marginLeft = "-26px";
			options.marginTop = "-26px";
		}
		options.border = 0;
		options.borderColor = "#000000";
		options.fontColor = "#000000";
		options.visible = true;
		options.clickable = true;	
		options.mouseover = true;
		options.padding = 3;
	
		options.map = map;
		options.position = latlng;
		return new g.Overlay(options, latlng, content);
	}
	
	// clearmap
	g.clearMap=function(){
		// clear clusters
		for(var i=0; i< clusters.length; i++){
			if(clusters[i] != undefined){
				google.maps.event.clearListeners(clusters[i], 'click');
				clusters[i].setMap(null);
			}
		}
		clusters = [];
		
		// clear all markers
		for(var i=0; i<markers.length; i++){
			if(markers[i] != undefined){
				google.maps.event.clearListeners(markers[i], 'click');
				markers[i].setMap(null);
			}
		}
		markers = [];
		
		// clear all labels
		for(var i=0; i<labels.length; i++){
			if(labels[i] != undefined){
				google.maps.event.clearListeners(labels[i], 'click');
				labels[i].setMap(null);
			}
		}
		labels = [];
		
		// clear all polylines
		/*for(var i=0; i<polylines.length; i++){
			if(polylines[i] != undefined){
				google.maps.event.clearListeners(polylines[i], 'click');
				polylines[i].setMap(null);
			}
		}
		polylines = [];
		
		// clear all rectangles
		for(var i=0; i<rectangles.length; i++){
			if(rectangles[i] != undefined){
				google.maps.event.clearListeners(rectangles[i], 'click');
				rectangles[i].setMap(null);
			}
		}
		rectangles = [];*/
		
		document.getElementById('gmap_list').innerHTML=""; // clear markers list first 
	}
	// lat, lng convert to gird. get icon style
	g.lat2int=function(lat){
		return Math.min(Math.max(Math.floor((lat+90)/180*Math.pow(2,32)),0),Math.pow(2,32)-1);
	}
	g.lng2int=function(lng){
		return Math.min(Math.max(Math.floor((lng+180)/360*Math.pow(2,32)),0),Math.pow(2,32)-1);
	}
	g.int2lat=function(val){
		return (val/Math.pow(2,32)*180) - 90
		//return Math.min(Math.max(Math.floor((lat+90)/180*Math.pow(2,32)),0),Math.pow(2,32)-1);
	}
	g.int2lng=function(val){
		return (val/Math.pow(2,32)*360) - 180
		//return Math.min(Math.max(Math.floor((lng+180)/360*Math.pow(2,32)),0),Math.pow(2,32)-1);
	}
	g.lat2grid=function(zoom,lat){
		// Mercator (Google) projection GRID ID with limits
		return Math.min(Math.max(Math.floor((Math.log(Math.tan(Math.PI/4+Math.PI*lat/360))+Math.PI)/(2*Math.PI)*Math.pow(2,zoom)),0),Math.pow(2,zoom)-1);
	}
	g.lng2grid=function(zoom,lng){
		return Math.max(Math.min(Math.floor((lng+180)/360*Math.pow(2,zoom)),Math.pow(2,zoom)-1),0);
	}
	
	var iconList = [];
	for(var i = 1; i <=14 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 32;
		iconList[i].imageh = 32;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 16;
		iconList[i].imageay = 32;
	}
	for(var i = 15; i <=21 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 32;
		iconList[i].imageh = 32;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 11;
		iconList[i].imageay = 32;
	}
	for(var i = 22; i <=71 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 31;
		iconList[i].imageh = 35;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 15;
		iconList[i].imageay = 34;
	}
	for(var i = 72; i <=74 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 20;
		iconList[i].imageh = 20;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 10;
		iconList[i].imageay = 10;
	}
	for(var i = 75; i <=86 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 12;
		iconList[i].imageh = 12;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 6;
		iconList[i].imageay = 6; // changed to 6
	}
	for(var i = 87; i <=95 ; i ++){
		iconList[i] = {};
		iconList[i].imagew = 31;
		iconList[i].imageh = 35;
		iconList[i].imageox = 0;
		iconList[i].imageoy = 0;
		iconList[i].imageax = 15;
		iconList[i].imageay = 35;
	}
	g.getMarkerIcon=function(id) {
		
		var w = 35;
		var h = 35;
		//check if id is icon url
		if( !isNaN(id) ){
			//var photograf = new Image();
			//photograf.src = markerPath+id;
			//w = photograf.width;
			//h = photograf.height;
			var iconimage = new google.maps.MarkerImage(
				markerPath+id,
				new google.maps.Size( iconList[id].imagew,iconList[id].imageh),
				new google.maps.Point(iconList[id].imageox,iconList[id].imageoy),
				new google.maps.Point( iconList[id].imageax,iconList[id].imageay)
			);
		}else{
			
			//var photograf = new Image();
			//photograf.src = id;
			//w = photograf.width;
			//h = photograf.height;
			var iconimage = new google.maps.MarkerImage(
				id,
				new google.maps.Size( w,h),
				new google.maps.Point(0,0),
				new google.maps.Point( w/2,h/2)
			);
		}
		return iconimage;
	}
	
	// add watermark on map
	g.addGMapIconOnMap=function(){
		var gmapicon_div=document.createElement("div");
		//gmapicon_div.style.width="480px";
		//gmapicon_div.style.height="320px";
		//gmapicon_div.style.backgroundColor="#F0F0F0";
		gmapicon_div.style.position="absolute";
		gmapicon_div.style.bottom="20px";
		gmapicon_div.style.left="40%";
		gmapicon_div.style.marginLeft="0px";
		gmapicon_div.style.marginBottom="0px";
		gmapicon_div.style.display='block';
		gmapicon_div.style.zIndex="1";
    //gmap_icon
		gmapicon_div.innerHTML=cl_content;
		
		if ( document.getElementById('gmap_'+gdata.id) ) {
			var map_div = document.getElementById('gmap_'+gdata.id);
			map_div.appendChild(gmapicon_div);
		}
	}
	// add crowdsourcing function
	g.crowdsourcingOnMap=function(){
		var map_div = document.getElementById('gmap_'+gdata.id);
		var crowdsourcing_div = document.createElement('div');
		crowdsourcing_div.id="crowdsourcingDiv";
		crowdsourcing_div.style.position="absolute";
		crowdsourcing_div.style.bottom="35px";
		crowdsourcing_div.style.left="5px";
		crowdsourcing_div.innerHTML='<input id="crowdsourcingBtn" type="button" value="Add Marker" onclick="net.imapbuilder.gmap.crowdsourcingAddMarker()" />';
		map_div.appendChild(crowdsourcing_div);
		
		// show alert box - prompt user to click a location on map, or cancel
		// show email addresss, title, description box to prompt user entering data
		// store the data and say refresh map to see the inserted marker
	}
	g.crowdsourcingAddMarker=function(){
		//alert("Crowdsourcing feature coming soon.");
		// click on the map to insert marker , ok / cancel
		crowdsourcingActive=confirm("Click on the map to create a marker.")
		//crowdsourcingActive=true;
	}
	
	// add search bar
	g.searchBarOnMap=function(){
		g.removeSearchBar();
		var map_div = document.getElementById('gmap_'+gdata.id);
		var searchbar_div = document.createElement('div');
		searchbar_div.id="searchbarDiv";
		searchbar_div.style.position="absolute";
		if(gdata.data.showpancontrol || gdata.data.showscalecontrol || gdata.data.showstreetviewcontrol || gdata.data.showzoomcontrol){
			searchbar_div.style.top="10px";
			searchbar_div.style.left="80px";
		}else{
			searchbar_div.style.top="10px";
			searchbar_div.style.left="10px";
		}
		var html = 'Search: <input type="text" id="searchbarInput" name="searchbar_input" title="Enter address or location" style="border:0px; width: 100px" class="tooltip" />'+
					'<input type="button" value="Search" id="searchInput" class="searchBtn_inactive" />'+
					'<div id="gSearchResult" align="left" style="display:none"></div>';
					//'<input type="button" value="Add Marker" id="searchAddMarker" class="searchBtn_inactive"/>'; 
		searchbar_div.innerHTML=html;
		map_div.appendChild(searchbar_div);
		
		$('#searchbarInput').click(function(){
			g.searchbarShow();
			$('#searchbarInput').css("color", "#000");
		});
		$('#searchInput').click(function(){
			if($('#searchbarInput').val() != ""){
				g.searchMarkers($('#searchbarInput').val());
			}
			$('#searchbarInput').focus();
		});
		/*
		$('#searchAddMarker').click(function(){
			if($('#searchbarInput').val() != "")
				searchQuickAdd($('#searchbarInput').val());
		});
		*/
		$('#searchbarInput').focusout(function(){
			$('#searchbarInput').css("color", "#999");
			setTimeout(function(){g.searchbarHide();},1000);
		});
	}
	g.searchMarkers=function(searchword){
		var zoom=map.getZoom();
		var sw=map.getBounds().getSouthWest(); // supposed min values
		var ne=map.getBounds().getNorthEast(); // supposed max values
			
		var minPoint = [g.lat2int(sw.lat()), g.lng2int(sw.lng())];
		var maxPoint = [g.lat2int(ne.lat()), g.lng2int(ne.lng())];
		
		categorylist=gdata.categorylist;		
		g.ajax("POST","//live.edit.g.imapbuilder.net/searchData/",{"uid": gdata.user , "map": gdata.id, "sw":minPoint, "ne":maxPoint, "level":zoom, "categorylist": JSON.stringify(gdata.categorylist), "searchword": searchword, "maxpoint": g.lng2int(180)},g.searchMarkersCallback);

	}
	g.searchMarkersCallback=function(responseText){
		var json=JSON.parse(responseText);
		var html = '';
		html += '<div>Results of "'+json.searchword+'":</div>'; 
		html += '<div style="width: 100%; padding: 10px"> - <a href="javascript:;" onclick="net.imapbuilder.gmap.goSearchPlace(\''+json.searchword+'\')">Do you want to find a place called "'+ json.searchword+'"</a></div>';
		html += '<div>';
		html += '<ul style="padding-left: 0px; margin: 0px; list-style: none;">';
		if(json.markers.length >0){
			for(var i=0; i< json.markers.length; i ++){
				var mdbid = json.markers[i].id ; 
				var mtitle = json.markers[i].title ; 
				var micon = json.markers[i].icon;
				if(!isNaN(micon)){
					micon = markerPath+micon; 
				}else{
					micon = micon; 
				}
				html += '<li style="height: 25px"><img src="'+micon+'" width="18px" align="left"/>&nbsp;<a href="javascript:;" onclick="net.imapbuilder.gmap.showSearchPlaceInfo(\''+mdbid+'\')">'+ mtitle +'</a></li>';
			}
		}else{
			html += '<li>No Related Marker Record.</li>';
		}
		html += '</ul>';
		html += '</div>';
		$('#gSearchResult').html(html);
		$('#gSearchResult').css("border-top", "1px dotted #CCC");
		$('#gSearchResult').css("padding", "2px 3px 3px 10px");
		$('#gSearchResult').show("slide", { direction: "up" }, 500);
	}
	g.goSearchPlace=function(value){
		var address = value; 
		map_geocoder.geocode({'address':address, 'bounds': map.getBounds()},function(results,status){
			if(status==google.maps.GeocoderStatus.OK){
				map.setCenter(results[0].geometry.location);
				if(results[0].geometry.viewport){
					map.fitBounds(results[0].geometry.viewport);
				}
			}else{
			}
		});
	}
	g.showSearchPlaceInfo=function(dbid){
		g.ajax("POST","//live.edit.g.imapbuilder.net/searchData/markerinfo.php",{"uid": gdata.user , "map": gdata.id, "dbid": dbid},g.showSearchMarkerInfoCallback);
	}
	g.showSearchMarkerInfoCallback=function(responseText){
		var json=JSON.parse(responseText);
		var mInfo = json.marker;
		var mTitle = mInfo.title;
		var mPos = mInfo.position;
		var mIcon = mInfo.icon;
		var mContent = mInfo.content;
		var mData = JSON.parse(mInfo.data);
		
		var pos = mPos.replace("POINT(", "");
		pos = pos.replace(")", "");
		var ppArr = pos.split(" ");
		g.closeInfoWindow();
		infowindow = new google.maps.InfoWindow();
		var infocontent = "<strong>"+mTitle+"</strong><br/>"+mContent; 
		infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(g.int2lat(ppArr[1]), g.int2lng(ppArr[0]))});
		infowindow.open(map);
	}
	g.removeSearchBar=function(){
		var map_div = document.getElementById('gmap_'+gdata.id);
		var searchbar_div = document.getElementById('searchbarDiv');
		if(searchbar_div != undefined){
			map_div.removeChild(searchbar_div);
		}
	}
	g.searchbarShow=function(){
		$('#searchInput').attr({
		  class: 'searchBtn_active'
		});
		/*
		$('#searchAddMarker').attr({
		  class: 'searchBtn_active'
		});
		*/
		$('#searchbarInput').animate({
			width: "200px",
		}, 400 );
	}
	g.searchbarHide=function(){
		if($('#searchbarInput').is(":focus")){
			setTimeout(function(){g.searchbarHide();},1000);
		}else{
			$('#searchInput').attr({
			  class: 'searchBtn_inactive'
			});
			/*
			$('#searchAddMarker').attr({
			  class: 'searchBtn_inactive'
			});
			*/
			$('#gSearchResult').css("padding", "0px");
			$('#gSearchResult').css("border-top", "0px");
			$('#gSearchResult').html('');
			$('#searchbarInput').animate({
				width: "100px",
			}, 400 );
		}
	}
	g.isEmpty=function(str) {
		return (!str || 0 === str.length);
	}
	var scheduledData = [];
	var scheduledCount = 0; 
	var scheduledTimer; 
	var scheduledGeoTime = 0;
	var scheduledSuccessTime = 100; 
	var scheduledFailTime = 1000; 
	var scheduledAttempt = 0;
	g.getScheduledMarker=function(){
		scheduledData = [];
		g.ajax("POST","//live.edit.g.imapbuilder.net/getScheduledData/",{},g.getScheduledMarkerCallback);
	}
	g.getScheduledMarkerCallback=function(responseText){
		var json=JSON.parse(responseText);
		scheduledData = json.scheduled;
		scheduledCount = 0;
		scheduledGeoTime = 0;
		g.startScheduledMarkers();
	}
	g.startScheduledMarkers=function(){
		if(scheduledCount < scheduledData.length){
			g.geocodeLocation();
		}else{
			// end scheduled geocode
		}
	}
	g.geocodeLocation=function(){
		var markerData = scheduledData[scheduledCount];
		if(markerData!= undefined){
			var geoAddress = markerData['scheduledgeo'];
			var mid = markerData['id'];
			map_geocoder.geocode({'address':geoAddress},function(results,status){
				if(status==google.maps.GeocoderStatus.OK){
					//map.setCenter(results[0].geometry.location);
					// save geocode
					g.saveGeocode(mid, results[0].geometry.location.lat(), results[0].geometry.location.lng(), "success");
					scheduledCount++;
					scheduledAttempt = 0;
					if(scheduledGeoTime > scheduledSuccessTime)
						scheduledGeoTime = scheduledGeoTime - scheduledSuccessTime;
				}else if(status==google.maps.GeocoderStatus.ZERO_RESULTS){
					// save geocode
					g.saveGeocode(mid, null, null, "noresult");
					scheduledCount++;
					scheduledAttempt = 0;
					if(scheduledGeoTime > scheduledSuccessTime)
						scheduledGeoTime = scheduledGeoTime - scheduledSuccessTime;
				}else{
					// skip
					if(scheduledAttempt < 3){ // retry 3 times
						scheduledAttempt ++ ;
						scheduledGeoTime = scheduledGeoTime + scheduledFailTime;
					}else{						
						scheduledAttempt = 0;
						scheduledCount++;
					}
					scheduledTimer = setTimeout(function(){g.startScheduledMarkers()}, scheduledGeoTime);
				}
				
			});
		}else{
			scheduledCount++;
			g.startScheduledMarkers();
		}
	}
	
	g.saveGeocode=function(mid, lat, lng, status){
		g.ajax("POST","//live.edit.g.imapbuilder.net/saveData/updatemarker.php",{"mid": mid, "lat": g.lat2int(lat), "lng": g.lng2int(lng), "status": status},g.saveGeocodeCallback);
	}
	g.saveGeocodeCallback=function(response){
		var json=JSON.parse(response);
		scheduledTimer = setTimeout(function(){g.startScheduledMarkers()}, scheduledGeoTime);
	}
	
		
	g.geographicCall=function(x,zoom,geographicID,follow){
		// check if zoom = current map zoom, if not, just abort as it's too late, save some CPU resource
		if(zoom!=map.getZoom()){
			return;
		}
		// chrome got bug of duplicate callbacks, need to handle manually here.
		//console.log(x);
		var data=JSON.parse(x);
		
		for(var g in data.Geo){
			// check current geo's zoom, if same, no need to update
			if(geozoom[geographicID+"_"+data.Geo[g].Id]==zoom){
				break; // or should we just "break"?
			}else{
				geozoom[geographicID+"_"+data.Geo[g].Id]=zoom;
			}
			// try to do the update of vectors 1 GEO each time instead of erasing the whole
			
			// before update, clear existing GEO from google map
			if(geo[geographicID+"_"+data.Geo[g].Id]){
				for(var polygon in geo[geographicID+"_"+data.Geo[g].Id]){
					geo[geographicID+"_"+data.Geo[g].Id][polygon].setMap(null);
				}
			}
			
			// check current zoom, if no change, no need to do anything
			
			// clear the memory as well
			geo[geographicID+"_"+data.Geo[g].Id]=[];
			// now render the polygons data
			for(var polygon=0; polygon<data.Geo[g].G.length; polygon++){
				var coor=[];
				for(var path=0; path<data.Geo[g].G[polygon].length; path++){
					coor[path]=[];
					var deltaLng=0;
					var deltaLat=0;
					for(var i=0; i<data.Geo[g].G[polygon][path][0].length-1; i++){ // ignore last point as it's auto repeated by google
						// adjust first point by 0.5 to the right to maintain average center
						// which was not maintained because of the binary bit reduce operation
						if(i==0){ // this is a good solve to nearby object problem as well.
							data.Geo[g].G[polygon][path][0][i]+=0.5;
							data.Geo[g].G[polygon][path][1][i]+=0.5;
						}
						deltaLng+=data.Geo[g].G[polygon][path][0][i];
						deltaLat+=data.Geo[g].G[polygon][path][1][i];
						// convert to real Lat Lng
						lng=deltaLng/Math.pow(2,9+zoom)*360-180;
						lat=deltaLat/Math.pow(2,9+zoom)*180-90;
						coor[path].push(new google.maps.LatLng(lat,lng));
					}
				}
				//console.log(google.maps.geometry.spherical.computeArea(coor[0]));
				//var area=google.maps.geometry.spherical.computeArea(coor[0]);
				//console.log(coor[0].length);
				//if(area>Math.pow(2,31-zoom)){ // only draw objects with more than 2 points so it wont be just a line
				var polygonProperties = {
					paths: coor,
					strokeColor: '#000000',
					strokeOpacity: 0.8,
					strokeWeight: 1,
					fillColor: '#000000',
					fillOpacity: 0.8 
				}
				//alert(tempGeo[geographicID].toSource());
				if(tempGeo[geographicID][data.Geo[g].Id] != undefined && tempGeo[geographicID][data.Geo[g].Id]['data'] != undefined){
					var pdata = JSON.parse(tempGeo[geographicID][data.Geo[g].Id]['data']);
					//gdata.data.heatMapEnable bool
					/*heatMapEnable: true
heatMapMaxColor: "rgb(0, 0, 255)"
heatMapMaxValue: "1"
heatMapMinColor: "rgb(0, 255, 0)"
heatMapMinValue: "1"*/
					//console.log(gdata.data);
					if(gdata.data.heatMapEnable){
						gdata.data.heatMapMaxValue=parseFloat(gdata.data.heatMapMaxValue);
						gdata.data.heatMapMinValue=parseFloat(gdata.data.heatMapMinValue);
						pdata.hv=parseFloat(pdata.hv);
						if(isNaN(pdata.hv)){ // treat NaN as value 0 for backward compatibility
							pdata.hv=0;
						}
						//console.log(tempGeo[geographicID][data.Geo[g].Id]['title']);
						//console.log(pdata);
						//console.log(tempGeo[geographicID]);
						//console.log(gdata.data);
						if(pdata.hv>=gdata.data.heatMapMaxValue){
							pdata.fc=gdata.data.heatMapMaxColor;
						}else{
							if(pdata.hv<=gdata.data.heatMapMinValue){
								pdata.fc=gdata.data.heatMapMinColor;
							}else{
								var maxColor=gdata.data.heatMapMaxColor.replace("rgb(","").replace(")","").replace(" ","").replace(" ","");
								var minColor=gdata.data.heatMapMinColor.replace("rgb(","").replace(")","").replace(" ","").replace(" ","");
								maxColor=maxColor.split(",");
								minColor=minColor.split(",");
								//console.log(maxColor);
								//console.log(minColor);
								var range=gdata.data.heatMapMaxValue-gdata.data.heatMapMinValue;
								var weightMax=(pdata.hv-gdata.data.heatMapMinValue)/range;
								var weightMin=1-weightMax;
								var colorR=Math.min(Math.round(weightMin*minColor[0]+weightMax*maxColor[0]),255);
								var colorG=Math.min(Math.round(weightMin*minColor[1]+weightMax*maxColor[1]),255);
								var colorB=Math.min(Math.round(weightMin*minColor[2]+weightMax*maxColor[2]),255);
								//var color=
								pdata.fc="rgb("+colorR+","+colorG+","+colorB+")";
								/*console.log(pdata.hv);
								console.log(weightMax);
								console.log(weightMin);
								console.log(color);*/
							}
						}
						/*if(gdata.data.heatMapMinValue<pdata.hv && pdata.hv<gdata.data.heatMapMaxValue){
							// mid range color mixing
							// extract rgb values
						}*/
					}
					polygonProperties = {
						paths: coor,
						strokeColor: pdata.sc,
						strokeOpacity: pdata.so,
						strokeWeight: pdata.sw,
						fillColor: pdata.fc,
						fillOpacity: pdata.fo 
					}
				
				
					geo[geographicID+"_"+data.Geo[g].Id][polygon]=new google.maps.Polygon(polygonProperties);
					geo[geographicID+"_"+data.Geo[g].Id][polygon].setMap(map);
					geo[geographicID+"_"+data.Geo[g].Id][polygon].id=data.Geo[g].Id;
					geo[geographicID+"_"+data.Geo[g].Id][polygon].gid=geographicID;
					geo[geographicID+"_"+data.Geo[g].Id][polygon].title=tempGeo[geographicID][data.Geo[g].Id]['title'];
					geo[geographicID+"_"+data.Geo[g].Id][polygon].description=tempGeo[geographicID][data.Geo[g].Id]['description'];
					
					/*google.maps.event.addListener(geo[data.Geo[g].Id][polygon],'mousemove',function() {
						if(geozoom[this.id]!=map.getZoom()){
							ajax("GET","//imaptile.appspot.com/geo/"+mapId+"/"+this.id+"/"+map.getZoom()+"/",call,map.getZoom(),true);
						}
					});*/
					google.maps.event.addListener(geo[geographicID+"_"+data.Geo[g].Id][polygon],'click',function(event) {
						net.imapbuilder.gmap.closeInfoWindow();
						var pdata = JSON.parse(tempGeo[this.gid][this.id]['data']);
						if(pdata['url'] != "" && pdata['url'] != "http://" && pdata['url'] != "https://"){
							if(	pdata['urlt'] == "_blank" ){
								window.open(pdata['url'], "_blank");
							}else if(pdata['urlt'] == "_self"){
								window.open(pdata['url'], "_self");
							}
						}
						var gTitle = this.title;
						var gDescription = this.description;
						infowindow = new google.maps.InfoWindow();
						var infocontent = "<strong>"+gTitle+"</strong><br/>"+gDescription; 
						infowindow.setOptions({content:infocontent,position:new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())});
						infowindow.open(map);
					});
					
				
				}
			}
		}
		return;
	}
	var geozoom=[];
	var geo=[]; // array of geo
	var gxhr = [];
	g.geographicCall2=function(x,zoom,geographicID,follow){
		//console.log("g.geographicCall2");
		var data=JSON.parse(x);
		for(var t in data.Tile){
			//var temp=t.split("/");
			if(!gxhr["tile/"+geographicID+"/"+t]){ // do call only of the ajax is not exist
				//alert("tile/"+geographicID+"/"+t);
				//alert(temp[0]);
				g.ajaxGeographic("GET","tile/"+geographicID+"/"+t,g.geographicCall,zoom,geographicID,true);
			}
		}
		return;
	}
	
	// Show Geographic
	g.ajaxGeographic=function(method,url,call,zoom,geographicID,follow){
		var id=url;
		if(gxhr[id]!=undefined)
			return; 
		if(window.XDomainRequest){
			gxhr[id]=new XDomainRequest;
			gxhr[id].onload=function(){
				call(this.responseText,zoom,geographicID,follow);
			}
			gxhr[id].open(method,"//imaptile.appspot.com/"+url+"/");
		}else{
			gxhr[id]=new XMLHttpRequest;
			gxhr[id].onreadystatechange=function(){
				if(this.readyState==4&&this.status==200){
					call(this.responseText,zoom,geographicID,follow);
				}
			}
			gxhr[id].open(method,"//imaptile.appspot.com/"+url+"/");
			if(method=="POST"){
				gxhr[id].setRequestHeader("Content-type","application/x-www-form-urlencoded");
			}
		}
		gxhr[id].send();
	}

})();
var mapkey="AIzaSyBTwU0SoLL5CJ4s1cvXdjAHpDjlfK-7jqg";var plan="0";var expire="0000-00-00 00:00:00";var objLimit="8";var quota="0";var size="";net.imapbuilder.gmap.run({"id":"72210","user":"159713","filename":"Need For Speed: World","data":"{\"center\":[-19.581809800238,-1853.4375],\"zoom\":3,\"maptype\":\"custom\",\"styleenable\":false,\"showmaptypecontrol\":true,\"showpancontrol\":true,\"showscalecontrol\":true,\"showstreetviewcontrol\":false,\"showzoomcontrol\":true,\"showsearchcontrol\":false,\"width\":700,\"height\":500,\"lang\":\"default\",\"fontsize\":12,\"fontfamily\":\"Times New Roman\",\"disabledoubleclickzoom\":false,\"mapdraggable\":true,\"enablekeyboardshortcuts\":false,\"enablescrollwheel\":true,\"disableautopanonopeninfowindow\":false,\"mlshow\":\"none\",\"mlpos\":\"top\",\"mlheight\":300,\"mlwidth\":250,\"mcenabled\":true,\"mcclick\":\"zoom\",\"mcgridsize\":50,\"mcmaxzoom\":12,\"stylename\":\"Custom\",\"theme\":\"\",\"style\":\"\",\"sso\":{\"id\":\"159713\",\"email\":\"soapbox@davidcarbon.dev\",\"key\":\"038db0728e8d0e4a48774b0ca36d2f8b\",\"gmap\":\"0\",\"livemap\":\"0\",\"flashmap\":\"0\"}}","signature":"4feea7f1539b5a94d3eaa5d77fdf6fe2","created":"2019-07-10 05:27:34","updated":"2019-07-10 05:29:22","deleted":"0000-00-00 00:00:00","categorylist":"[]"});
