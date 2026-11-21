(()=>{'use strict';
const $=id=>document.getElementById(id),host=$('gps-map-real'),fallback=$('gps-map-fallback'),notice=$('gps-map-overlay'),stops=window.budapestMapStops||[];
let map=null,tiles=null,target=window.budapestMapCurrentTarget||stops[0],position=null,markers={},me=null,accuracy=null,guide=null,userMoved=false,loading=false,started=false,hasTiles=false;
function status(message){notice.textContent=message;notice.hidden=!message}
function unavailable(msg){fallback.hidden=false;host.hidden=true;status(msg)}
function latlng(p){return [p.lat,p.lon]}
function markerIcon(p,isTarget){return L.divIcon({className:'gps-pin',html:'<span class="gps-pin-dot'+(isTarget?' is-target':'')+'">'+(p.key==='godollo'?'G':p.key==='keleti'?'K':p.key==='food'?'R':p.key==='bar'?'B':'•')+'</span>',iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-18]})}
function focusTarget(){if(!map||!target)return;userMoved=false;map.setView(latlng(target),15,{animate:false})}
function focusMe(){if(!map){start();return}if(!position){if($('gps-toggle').getAttribute('aria-pressed')!=='true')$('gps-toggle').click();status('Bitte GPS aktivieren und Standortfreigabe erlauben');return}userMoved=false;map.setView(latlng(position),16,{animate:false})}
function showBoth(){if(!map){start();return}if(position&&target){userMoved=false;map.fitBounds([latlng(position),latlng(target)],{padding:[35,35],maxZoom:16,animate:false})}else focusTarget()}
function draw(){if(!map)return;
for(const p of stops)if(markers[p.key])markers[p.key].setIcon(markerIcon(p,target?.key===p.key));
if(target&&map._targetKey!==target.key){map._targetKey=target.key;if(!userMoved)focusTarget()}
if(position){if(!me){me=L.circleMarker(latlng(position),{radius:8,color:'#fff',weight:3,fillColor:'#398bfa',fillOpacity:1}).addTo(map).bindPopup('Dein aktueller Standort');accuracy=L.circle(latlng(position),{radius:Math.max(position.acc||10,5),color:'#398bfa',weight:1,fillColor:'#398bfa',fillOpacity:.13}).addTo(map)}else{me.setLatLng(latlng(position));accuracy.setLatLng(latlng(position));accuracy.setRadius(Math.max(position.acc||10,5))}
if(target){const l=[latlng(position),latlng(target)];if(!guide)guide=L.polyline(l,{color:'#387dd4',weight:3,dashArray:'5 8',opacity:.85}).addTo(map);else guide.setLatLngs(l)}}
else{if(me){map.removeLayer(me);map.removeLayer(accuracy);me=accuracy=null}if(guide){map.removeLayer(guide);guide=null}}}
function init(){if(started||!window.L||!stops.length)return;try{
started=true;host.hidden=false;map=L.map(host,{zoomControl:true,scrollWheelZoom:false,attributionControl:true,zoomSnap:.5}).setView(latlng(target||stops[0]),15);
map._targetKey=target?.key||stops[0].key;
tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',updateWhenIdle:true,keepBuffer:1});
tiles.on('tileload',()=>{if(!hasTiles){hasTiles=true;fallback.hidden=true;status('');setTimeout(()=>map?.invalidateSize(),100)}});
tiles.on('tileerror',()=>{if(!hasTiles)status('Kartendaten nicht erreichbar · schematische Karte verfügbar')});
tiles.addTo(map);
for(const p of stops)markers[p.key]=L.marker(latlng(p),{icon:markerIcon(p,p.key===target?.key),keyboard:true}).addTo(map).bindPopup(p.name);
map.on('dragstart',()=>{userMoved=true});map.on('zoomstart',()=>{userMoved=true});
setTimeout(()=>{if(map){map.invalidateSize();if(!hasTiles)unavailable(navigator.onLine?'Keine Straßenkartenkacheln geladen · schematische Karte':'Offline · schematische Karte')}},10500);
draw();
}catch(e){unavailable('Straßenkarte nicht verfügbar · schematische Karte')}}
function start(){if(started||loading||document.hidden||!navigator.onLine)return;loading=true;status('Straßenkarte wird geladen …');
if(window.L){loading=false;init();return}
if(!document.querySelector('link[data-budapest-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.dataset.budapestLeaflet='true';document.head.append(css)}
const s=document.createElement('script');s.async=true;s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>{loading=false;init()};s.onerror=()=>{loading=false;unavailable('Straßenkarte benötigt Internet · schematische Karte')};document.head.append(s)}
window.budapestMapUpdate=(pos,p)=>{const key=target?.key;target=p||target||stops[0];position=pos&&Number.isFinite(pos.lat)&&Number.isFinite(pos.lon)?pos:null;if(key!==target?.key)userMoved=false;if(map)draw()};
$('gps-map-target').addEventListener('click',()=>map?focusTarget():start());
$('gps-map-me').addEventListener('click',focusMe);
$('gps-map-both').addEventListener('click',showBoth);
window.addEventListener('online',start);document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();map?.invalidateSize()}});
if(!navigator.onLine)unavailable('Offline · schematische Karte');else start();
})();