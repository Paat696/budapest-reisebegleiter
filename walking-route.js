(()=>{'use strict';
const $=id=>document.getElementById(id),button=$('gps-route-start'),info=$('gps-route-status'),formula='https://routing.openstreetmap.de/routed-foot/route/v1/driving/';
let enabled=false,point=null,dest=null,mode='walking',lastRequest=0,requestKey='',inflight=null,route=null,requestId=0,delayed=null;
const rad=x=>x*Math.PI/180;
function distance(a,b){const d=rad(b.lat-a.lat),l=rad(b.lon-a.lon),x=Math.sin(d/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(l/2)**2;return 12742000*Math.asin(Math.sqrt(Math.max(0,Math.min(1,x))))}
function meters(m){return m>=1000?(m/1000).toLocaleString('de-DE',{maximumFractionDigits:2})+' km':Math.max(0,Math.round(m/10)*10)+' m'}
function send(){try{window.dispatchEvent(new Event('budapest-route-state'))}catch(e){}}
function status(s){if(info.textContent!==s){info.textContent=s;send()}}
function routeFor(key){if(!enabled||!point||!dest||key!==dest.key||!route||route.key!==dest.key||Date.now()-route.checked>120000||distance(point,route.start)>160)return null;return route}
window.budapestWalkingGet=routeFor;
function clear(m,disable=false){if(delayed){clearTimeout(delayed);delayed=null}if(inflight){inflight.abort();inflight=null}requestId++;route=null;requestKey='';if(disable){enabled=false;button.setAttribute('aria-pressed','false');button.textContent='Fußweg berechnen'}status(m)}
function output(){const r=dest&&routeFor(dest.key);if(!enabled){button.textContent='Fußweg berechnen';return}button.textContent='Fußweg aktualisieren';if(r){const minutes=Math.max(1,Math.ceil(r.duration/60));$('gps-dist').textContent=meters(r.distance);$('gps-walk').textContent='ca. '+minutes+' Min.';$('gps-age').textContent='Fußweg entlang Wegen · berechnet '+new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'}).format(new Date(r.checked))+' · keine Live-Verkehrsdaten';}}
function request(){if(!enabled||!point||!dest||mode!=='walking'||document.hidden)return;if(!navigator.onLine){status('Offline · Fußweg nicht verfügbar. Google Maps bei Internet nutzen.');return}
const d=distance(point,dest);if(d>6000){clear('Mehr als 6 km entfernt · Fernstrecke in Google Maps planen.');return}
if(point.acc>150){status('GPS zu ungenau · auf besseren Empfang warten');return}
const key=dest.key+':'+Math.round(point.lat*10000)/10000+':'+Math.round(point.lon*10000)/10000;if(routeFor(dest.key)&&distance(point,route.start)<65&&Date.now()-route.checked<90000){output();return}
if(inflight)return;
if(Date.now()-lastRequest<30000){if(!delayed){delayed=setTimeout(()=>{delayed=null;request()},30000-(Date.now()-lastRequest)+100)}return}
if(requestKey===key&&routeFor(dest.key)){output();return}
lastRequest=Date.now();requestKey=key;const id=++requestId,here={lat:point.lat,lon:point.lon},where={lat:dest.lat,lon:dest.lon},target=dest.key;const controller=new AbortController();inflight=controller;
status('Echter Fußweg wird berechnet …');const timeout=setTimeout(()=>controller.abort(),13000);
fetch(formula+here.lon.toFixed(6)+','+here.lat.toFixed(6)+';'+where.lon.toFixed(6)+','+where.lat.toFixed(6)+'?overview=full&geometries=geojson&steps=false',{method:'GET',signal:controller.signal,credentials:'omit',cache:'no-store',mode:'cors'}).then(res=>{if(!res.ok)throw Error('HTTP '+res.status);return res.json()}).then(json=>{if(!enabled||id!==requestId||dest?.key!==target)return;const r=json?.routes?.[0],c=r?.geometry?.coordinates;if(json.code!=='Ok'||!Number.isFinite(r?.distance)||!Number.isFinite(r?.duration)||!Array.isArray(c)||c.length<2||r.distance<0||r.distance>20000||r.duration<=0)throw Error('Invalid route');const coords=c.filter(x=>Array.isArray(x)&&x.length>=2&&Number.isFinite(x[0])&&Number.isFinite(x[1]));if(coords.length<2)throw Error('Invalid coordinates');route={key:target,start:here,distance:r.distance,duration:r.duration,geometry:coords,checked:Date.now()};status('Fußweg berechnet · OpenStreetMap-Routing');output()}).catch(err=>{if(id!==requestId||!enabled)return;route=null;status(err.name==='AbortError'?'Routing-Zeitüberschreitung · Google Maps nutzen':'Fußweg aktuell nicht verfügbar · Google Maps nutzen')}).finally(()=>{clearTimeout(timeout);if(inflight===controller)inflight=null;send()})
}
window.budapestWalkingRouteUpdate=(p,t,m)=>{const key=dest?.key;point=p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)?p:null;dest=t||null;mode=m||'walking';
if(!point){const gpsOn=$('gps-toggle')?.getAttribute('aria-pressed')==='true';if(route||inflight||enabled)clear(gpsOn?'GPS sucht Standort · Wegstrecke nicht verfügbar':'GPS deaktiviert · Fußwegberechnung aus',!gpsOn);return}
if(key!==dest?.key){if(inflight){inflight.abort();inflight=null}route=null;requestKey='';requestId++;send()}
if(mode!=='walking'){if(route||inflight)clear('Zug/Metro · Wegstrecke in Google Maps prüfen');else status('Zug/Metro · keine Fußwegroute');return}
if(!enabled){status('Für echte Fußwege: GPS aktivieren und „Fußweg berechnen“ antippen.');return}
if(routeFor(dest.key)){output();return}status('Fußweg wird aktualisiert …');request()
};
button.addEventListener('click',()=>{if(!point){status('Bitte zuerst GPS aktivieren und Standortfreigabe erlauben.');return}enabled=true;button.setAttribute('aria-pressed','true');button.textContent='Fußweg aktualisieren';request()});
window.addEventListener('online',()=>{if(enabled)request()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(delayed){clearTimeout(delayed);delayed=null}if(inflight){inflight.abort();inflight=null;requestId++}}else if(enabled)request()});
window.addEventListener('pagehide',()=>clear('GPS-Fußweg beendet',true));
status('GPS aktivieren und Fußweg berechnen');
})();