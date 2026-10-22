// 赵县村庄来历 · 试作版
const COLORS={pre_ming:"#2e6b3a",hongdong_min:"#a8322a",shanxi_min:"#d0702a",tunken:"#b8892f",branch:"#0f766e",other_prov:"#6b4f8a",ming_local:"#4f6d8a",later:"#8a7a6a",junhu:"#6b4f8a",unknown:"#bbb"};
const CATNAME={pre_ming:"明代以前就有",hongdong_min:"明初自山西洪洞迁来",shanxi_min:"明初自山西他县迁来",tunken:"明初屯垦建村",branch:"从附近村分出",other_prov:"自外省迁来",ming_local:"明代建村",later:"清代以后建村",junhu:"明初军户迁来",unknown:"建村年代不详"};
const CONF={T:'<span class="tag tC">传统说法</span>',A:'<span class="tag tA">A 碑刻/官修志书</span>',B:'<span class="tag tB">B 新编志书转引</span>',C:'<span class="tag tC">C 口传</span>'};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- map & panes ----------
const map=L.map("map",{zoomControl:false,markerZoomAnimation:false,minZoom:5,maxZoom:15,zoomSnap:.25,preferCanvas:true,maxBounds:[[30,104],[45,126]]}).setView([37.3,114.2],6.5);
map.attributionControl.setPrefix(false).addAttribution("© OpenStreetMap · DataV · 地形 AWS Terrain");
L.control.zoom({position:"bottomright"}).addTo(map);
[["pFill",200],["pTerrain",250],["pBounds",300],["pRivers",350],["pFlows",420],["pPts",450],["pLbl",520]].forEach(([n,z])=>{map.createPane(n).style.zIndex=z;});
map.getPane("pTerrain").style.pointerEvents="none";map.getPane("pLbl").style.pointerEvents="none";
const cv=L.canvas({pane:"pPts",padding:.3});
const sv=L.svg({pane:"pFlows",padding:.5});

const ll=r=>r.map(([x,y])=>[y,x]);
const PROV_FILL={"山西":"#e8d6b2","河北":"#efe4cc","河南":"#ece0c6","山东":"#ece0c6","北京":"#ebdfc4","天津":"#ebdfc4"};
const fill=L.layerGroup().addTo(map);
for(const n in PROV_FILL) L.polygon(GEO[n].map(ll),{pane:"pFill",stroke:false,fillColor:PROV_FILL[n],fillOpacity:1,interactive:false}).addTo(fill);

const terrain=L.imageOverlay("hillshade.webp",HSB,{pane:"pTerrain",opacity:.9,interactive:false}).addTo(map);
const bounds=L.layerGroup().addTo(map), rivers=L.layerGroup().addTo(map);
const countyLines=L.layerGroup();
for(const n in PROV_FILL) L.polygon(GEO[n].map(ll),{pane:"pBounds",color:"#8a7354",weight:1.6,fill:false,interactive:false}).addTo(bounds);
L.polygon(GEO["赵县"].map(ll),{pane:"pBounds",color:"#a8322a",weight:1.8,fill:false,interactive:false}).addTo(bounds);
const PLBL=[["山 西",[37.6,112.0]],["河 北",[38.9,115.8]],["河 南",[34.7,113.6]],["山 东",[36.3,118.0]]];
const provLabels=L.layerGroup().addTo(map);
for(const[n,p]of PLBL) L.marker(p,{pane:"pLbl",icon:L.divIcon({className:"lbl",html:n,iconSize:null}),interactive:false}).addTo(provLabels);

let COUNTIES=[],PREFS=[],PLACES=null;
function ptIn(x,y,rings){for(const r of rings){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}if(c)return true;}return false;}
function bbox(rings){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const r of rings)for(const[x,y]of r){if(x<a)a=x;if(y<b)b=y;if(x>c)c=x;if(y>d)d=y;}return[a,b,c,d];}
fetch("data/prefs.json").then(r=>r.json()).then(d=>{PREFS=d;for(const p of d){p.bb=bbox(p.r);for(const r of p.r)L.polyline(ll(r),{pane:"pBounds",color:"#9c8661",weight:.8,opacity:.8,dashArray:"3 3",interactive:false}).addTo(bounds);}});
fetch("data/counties.json").then(r=>r.json()).then(d=>{COUNTIES=d;for(const c of d){c.bb=bbox(c.r);for(const r of c.r)L.polyline(ll(r),{pane:"pBounds",color:"#a8916c",weight:.5,opacity:.7,interactive:false}).addTo(countyLines);}onCounty();});
fetch("data/rivers.json").then(r=>r.json()).then(d=>{for(const n in d){const major=["黄河","汾河","滹沱河","滏阳河","漳河","卫河","永定河","桑干河","子牙河","大清河","海河","沁河"].includes(n);let longest=null,lmax=0;
  for(const line of d[n]){L.polyline(line,{pane:"pRivers",color:"#6f9aa3",weight:n==="黄河"?2.4:(major?1.4:1),opacity:.85,interactive:false}).addTo(rivers);if(line.length>lmax){lmax=line.length;longest=line;}}
  if(longest){const m=longest[Math.floor(longest.length/2)];const mk=L.marker(m,{pane:"pLbl",icon:L.divIcon({className:"rv",html:n,iconSize:null}),interactive:false});mk.minZ=n==="黄河"?5:(major?7:9);mk.addTo(rivers);riverLabels.push(mk);}}
  zoomSync();});
const riverLabels=[];
map.on("zoomend",()=>{zoomSync();});
// village name labels at high zoom
const nameLayer=L.layerGroup().addTo(map);
function updNames(){nameLayer.clearLayers();if(map.getZoom()<11.5)return;const b=map.getBounds();let n=0;
  const add=(nm,la,lo)=>{if(n>260||!b.contains([la,lo]))return;n++;L.marker([la,lo],{pane:"pLbl",icon:L.divIcon({className:"city",html:esc(nm),iconSize:null,iconAnchor:[-5,5]}),interactive:false}).addTo(nameLayer);};
  if(PLACES){for(const p of PLACES)add(p[0],p[1],p[2]);}else{for(const v of VIL.pilot)add(v.osm_name,v.lat,v.lon);for(const o of VIL.others)add(o.n,o.lat,o.lon);}}
map.on("moveend",updNames);
function zoomSync(){const z=map.getZoom();{const lg=document.getElementById("mapLegend");if(lg)lg.classList.toggle("hidden",!(want("zx")&&z>=8.5));}
  for(const m of riverLabels){const el=m.getElement();if(el)el.style.display=z>=m.minZ?"":"none";}
  if(want("bounds")&&z>=8)countyLines.addTo(map);else map.removeLayer(countyLines);
  if(want("zx")&&z>=8.5)zxLayer.addTo(map);else map.removeLayer(zxLayer);
  for(const m of cityLbls){const el=m.getElement();if(el)el.style.display=z>=m.minZ?"":"none";}
}

// ---------- cities, ming seats, flows ----------
const SRC={"洪洞":[36.270,111.672],"太原":[37.87,112.55],"平定":[37.79,113.63],"泽州":[35.49,112.85],"潞州":[36.19,113.11]};
const DST={"北京":[39.90,116.40],"定州":[38.52,114.99],"赵县":[37.756,114.776],"赞皇":[37.67,114.39],"新河":[37.52,115.25],"枣强":[37.51,115.72],"惠民":[37.49,117.51],"馆陶":[36.54,115.28],"林州":[36.08,113.82],"金乡":[35.07,116.31],"曹县":[34.83,115.54]};
const DPOP={"枣强":"二次分发点：山东北部很多村记载「自枣强迁来」。惠民县 1254 村中约 1056 村如此记载。","新河":"傅振伦《新河县迁民调查》（1982）列有大量明初自山西洪洞迁来的村和姓。","赞皇":"《赞皇地名资料汇编》（1983）：212 个行政村中 65 个记为明洪武、永乐至清初自山西迁来，迁出地有洪洞、阳曲、繁峙、太原、平定等。","定州":"李景汉《定县社会概况调查》：东亭乡 62 村，除 2 村外多称燕王扫北后自山西洪洞迁来。","馆陶":"1999 版《馆陶县志》：多数村记为永乐二年奉诏从洪洞迁来，另有 3 村来自山东益都。","北京":"永乐年间多次迁民充实北京周边，《北京地名典》中多村记载来自洪洞。","惠民":"约 1056 村记载自河北枣强迁来。","金乡":"山东金乡县 1247 村中明代建村 830 个。","曹县":"山东曹县 2276 个自然村中明代移民建村 1606 个。","林州":"河南林县多数村庄记载自山西迁来。","赵县":"明代赵州，属真定府。放大地图看逐村来历。"};
const cities=L.layerGroup(), cityLbls=[];
function city(n,p,key,pop,minZ=5){
  L.circleMarker(p,{renderer:cv,radius:key?5:3.2,color:"#fbf6ea",weight:1,fillColor:key?"#a8322a":"#2b2118",fillOpacity:1}).bindPopup(pop).addTo(cities);
  const m=L.marker(p,{pane:"pLbl",icon:L.divIcon({className:"city"+(key?" key":""),html:n,iconSize:null,iconAnchor:({"枣强":[-5,-5],"赞皇":[34,6],"新河":[-5,16]})[n]||[-6,6]}),interactive:false}).addTo(cities);m.minZ=minZ;cityLbls.push(m);
}
city("洪洞（大槐树）",SRC["洪洞"],true,"<b>洪洞县 · 大槐树</b><br>民间传说里明初移民在这里集合出发。实际的迁出地遍及山西多个州县。<br><span class='sub'>曹树基《中国移民史·明时期》；赵世瑜关于大槐树传说的研究</span>");
for(const n of ["太原","平定","泽州","潞州"]) city(n,SRC[n],false,`<b>${n}</b><br>明初迁民的迁出地之一。<br><span class='sub'>见赞皇、新河等县地名资料</span>`);
for(const n in DST) city(n,DST[n],n==="赵县",`<b>${n}</b><br>${DPOP[n]||""}`);
const ming=L.layerGroup();
for(const[n,pr,la,lo,note]of MING){
  L.circleMarker([la,lo],{renderer:cv,radius:4,color:"#6b4f8a",weight:1.5,fillColor:"#fbf6ea",fillOpacity:1}).bindPopup(`<b>${n}</b>（明·${pr}）<br>${note}`).addTo(ming);
  L.marker([la,lo],{pane:"pLbl",icon:L.divIcon({className:"city ming",html:n,iconSize:null,iconAnchor:[-6,-4]}),interactive:false}).addTo(ming);
}
const flows=L.layerGroup().addTo(map);
const ROUTES={hongwu:[["洪洞","赞皇"],["平定","定州"],["泽州","馆陶"],["潞州","林州"],["洪洞","新河"],["洪洞","枣强"],["枣强","惠民"],["泽州","曹县"],["洪洞","金乡"]],
  yongle:[["洪洞","北京"],["太原","北京"],["洪洞","赵县"],["平定","赵县"],["洪洞","定州"]]};
const P=n=>SRC[n]||DST[n];
const ctrl=(a,b)=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;return[mx+(b[1]-a[1])*.18,my-(b[0]-a[0])*.18];};
const bez=(a,c,b,t)=>{const u=1-t;return[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]];};
let parts=[];
function setFlows(keys){flows.clearLayers();parts=[];
  for(const k of keys)for(const[s,d]of ROUTES[k]){const a=P(s),b=P(d),c=ctrl(a,b),pts=[];for(let i=0;i<=30;i++)pts.push(bez(a,c,b,i/30));
    L.polyline(pts,{pane:"pFlows",color:"#a8322a",weight:1.4,opacity:.4,interactive:false}).addTo(flows);
    for(let j=0;j<5;j++)parts.push({m:L.circleMarker(a,{renderer:cv,radius:2.4,stroke:false,fillColor:"#a8322a",fillOpacity:.9,interactive:false}).addTo(flows),a,c,b,t:Math.random(),v:.003+Math.random()*.004});}}
(function tick(){if(!map._animatingZoom)for(const p of parts){p.t+=p.v;if(p.t>1)p.t=0;p.m.setLatLng(bez(p.a,p.c,p.b,p.t));p.m.setStyle({fillOpacity:Math.sin(p.t*Math.PI)});}requestAnimationFrame(tick);})();

// ---------- zhaoxian villages ----------
const zxLayer=L.layerGroup();
for(const o of VIL.others) L.circleMarker([o.lat,o.lon],{renderer:cv,radius:3,color:"#999",weight:1,fillColor:"#fff",fillOpacity:1}).bindPopup(`<b>${esc(o.n)}</b><br>《赵县地名资料汇编》（1984）里没有单独的条目，可能是后来分出或改名的村。`).addTo(zxLayer);
const PILOT={},pilotMk=[];
function pilotHtml(v){return `<b>${v.osm_name}</b> <span style="color:${COLORS[v.category]}">● ${CATNAME[v.category]}</span><div style="margin:4px 0;max-height:9em;overflow:auto">${esc(v.history||"")}</div><span class="sub">${v.evidence}</span> ${CONF[v.confidence]}`;}
for(const v of VIL.pilot){PILOT[v.osm_name]=v;const m=L.circleMarker([v.lat,v.lon],{renderer:cv,radius:5.5,color:"#fbf6ea",weight:1.2,fillColor:COLORS[v.category],fillOpacity:1}).bindPopup(pilotHtml(v)).addTo(zxLayer);m.cat=v.category;pilotMk.push(m);}

// ---------- surname layer ----------
const surname=L.layerGroup();
let PLACES_P=null,PLACES_ERR=null;
function loadPlaces(){if(PLACES)return Promise.resolve(PLACES);if(PLACES_P)return PLACES_P;
  const timeout=new Promise(res=>setTimeout(()=>res("timeout"),25000));
  PLACES_P=Promise.race([fetch("data/places.json").then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}),timeout]).then(d=>{if(d==="timeout")throw new Error("村名数据下载超时");PLACES=d;$("#stPlaces").textContent=(d.length/10000).toFixed(1)+"万";return d;})
    .catch(e=>{PLACES_ERR=e.message||String(e);PLACES_P=null;return null;});
  return PLACES_P;}
const SN_RE=s=>new RegExp(`^[东西南北前后大小上下中新老]?${s}`);
function surnamePlaces(s){if(!PLACES)return[];const re=SN_RE(s);return PLACES.filter(p=>!p[3]&&re.test(p[0]));}
function showSurname(s){surname.clearLayers();if(!s||!PLACES)return[];const list=surnamePlaces(s);
  for(const[n,la,lo]of list)L.circleMarker([la,lo],{renderer:cv,radius:3.2,color:"#fbf6ea",weight:.8,fillColor:"#0f766e",fillOpacity:.9}).bindPopup(`<b>${esc(n)}</b><br>名字以「${esc(s)}」开头的村。不一定是${esc(s)}姓建的村。`).addTo(surname);
  setLayer("surname",true);return list;}
function provOf(lat,lon){for(const p of PREFS){const[a,b,c,d]=p.bb;if(lon<a||lon>c||lat<b||lat>d)continue;if(ptIn(lon,lat,p.r))return({"130000":"河北","140000":"山西","370000":"山东","410000":"河南","110000":"北京","120000":"天津"})[p.pr];}return"其他";}
function countyOf(lat,lon){for(const c of COUNTIES){const[a,b,cc,d]=c.bb;if(lon<a||lon>cc||lat<b||lat>d)continue;if(ptIn(lon,lat,c.r))return c;}return null;}
const km=(a,b)=>{const R=6371,dl=(b[0]-a[0])*Math.PI/180,dn=(b[1]-a[1])*Math.PI/180;const x=Math.sin(dl/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x));};

// ---------- layers panel ----------
const LAY={terrain,rivers,bounds,ming,flows,zx:zxLayer,surname,refs:null};
const want=k=>$(`#layersPanel input[data-l="${k}"]`).checked;
function setLayer(k,on){$(`#layersPanel input[data-l="${k}"]`).checked=on;applyLayers();}
function applyLayers(){for(const k in LAY){if(k==="zx"||!LAY[k])continue;want(k)?LAY[k].addTo(map):map.removeLayer(LAY[k]);}zoomSync();}
document.querySelectorAll("#layersPanel input").forEach(cb=>cb.onchange=applyLayers);
$("#btnLayers").onclick=()=>{$("#about").classList.add("hidden");$("#layersPanel").classList.toggle("hidden");};
$("#btnAbout").onclick=()=>{$("#layersPanel").classList.add("hidden");$("#about").classList.toggle("hidden");};
document.querySelectorAll("[data-close]").forEach(a=>a.onclick=()=>$("#"+a.dataset.close).classList.add("hidden"));

// ---------- sheet ----------
$("#grab").onclick=()=>$("#sheet").classList.toggle("min");
const sheetH=()=>$("#sheet").offsetHeight;
function fly(b,maxZ){map.flyToBounds(b,{paddingTopLeft:[16,50],paddingBottomRight:[16,sheetH()+10],duration:1.1,maxZoom:maxZ||13});}
const refs=L.layerGroup().addTo(map);
function route(a,b,dashed){const c=ctrl(a,b),pts=[];for(let i=0;i<=30;i++)pts.push(bez(a,c,b,i/30));
  L.polyline(pts,{pane:"pFlows",color:"#a8322a",weight:dashed?1.8:1.6,opacity:dashed?.75:.5,dashArray:dashed?"5 6":null,interactive:false}).addTo(flows);
  if(!dashed)for(let j=0;j<8;j++)parts.push({m:L.circleMarker(a,{renderer:cv,radius:2.6,stroke:false,fillColor:"#a8322a",fillOpacity:.9,interactive:false}).addTo(flows),a,c,b,t:Math.random(),v:.003+Math.random()*.004});}
function refMark(lat,lon,label,html,color){L.circleMarker([lat,lon],{renderer:sv,radius:6,color:"#fbf6ea",weight:1.5,fillColor:color||"#a8322a",fillOpacity:1}).bindPopup(html).addTo(refs);
  L.marker([lat,lon],{pane:"pLbl",icon:L.divIcon({className:"city key",html:esc(label),iconSize:null,iconAnchor:[-7,6]}),interactive:false}).addTo(refs);}

// ---------- search ----------
let me=null,STEPS=[];
// ---------- autocomplete ----------
let VPOOL=[],VPOOL_C=null;
const PREF_NAME={};
function curCounty(){const name=$("#qCounty").value.trim();return COUNTIES.find(x=>x.n===name)||COUNTIES.find(x=>name&&x.n.startsWith(name))||null;}
function onCounty(){const c=curCounty();if(!c||c===VPOOL_C)return;VPOOL_C=c;VPOOL=[];
  const towns=[];const build=()=>{
    if(PLACES){const[a,b,cc,d]=c.bb;for(const p of PLACES)if(p[2]>=a&&p[2]<=cc&&p[1]>=b&&p[1]<=d&&ptIn(p[2],p[1],c.r))(p[3]?towns:VPOOL).push({n:p[0],lat:p[1],lon:p[2]});}
    else if(c.n==="赵县"){for(const v of VIL.pilot)VPOOL.push({n:v.osm_name,lat:v.lat,lon:v.lon});for(const o of VIL.others)VPOOL.push({n:o.n,lat:o.lat,lon:o.lon});}
    for(const v of VPOOL){let best=null,bd=1e9;for(const t of towns){const dd=(t.lat-v.lat)**2+(t.lon-v.lon)**2;if(dd<bd){bd=dd;best=t;}}v.town=best?best.n:"";v.known=c.n==="赵县"&&VIL.pilot.some(p=>p.osm_name===v.n);}
    VPOOL.sort((x,y)=>x.n.localeCompare(y.n,"zh"));};
  build();loadPlaces().then(()=>{if(VPOOL_C===c){VPOOL=[];build();}});}
function acShow(box,items,onPick){if(!items.length){box.classList.add("hidden");return;}
  box.innerHTML=items.map((it,i)=>`<div class="ac-i" data-i="${i}">${it.html}</div>`).join("");box.classList.remove("hidden");
  box.querySelectorAll(".ac-i").forEach(el=>el.onmousedown=el.ontouchstart=ev=>{ev.preventDefault();onPick(items[+el.dataset.i]);box.classList.add("hidden");});}
function hl(n,q){if(!q)return esc(n);let out="";for(const ch of n)out+=q.includes(ch)?`<b class="m">${esc(ch)}</b>`:esc(ch);return out;}
function acVillage(){const q=$("#qVillage").value.trim().replace(/村$/,"");const box=$("#acVillage");
  if(!VPOOL.length){box.innerHTML=`<div class="ac-i sub">先填县</div>`;box.classList.remove("hidden");return;}
  let list=q?VPOOL.filter(v=>[...q].every(ch=>v.n.includes(ch))):VPOOL;
  list=list.slice().sort((a,b)=>(b.n.startsWith(q)-a.n.startsWith(q))||(a.n.length-b.n.length));
  const total=list.length;list=list.slice(0,40);
  acShow(box,list.map(v=>({v,html:`<span>${hl(v.n,q)}</span><span class="sub">${v.town?esc(v.town)+"附近":""}${v.known?' · <span style="color:#2e6b3a">已整理</span>':""}</span>`})).concat(total>40?[{v:null,html:`<span class="sub">还有 ${total-40} 个，多输一个字缩小范围</span>`}]:[]),it=>{if(it.v)$("#qVillage").value=it.v.n;});}
function acCounty(){const q=$("#qCounty").value.trim().replace(/[县市区]$/,"");const box=$("#acCounty");if(!q){box.classList.add("hidden");return;}
  const list=COUNTIES.filter(c=>[...q].every(ch=>c.n.includes(ch))).sort((a,b)=>(b.n.startsWith(q)-a.n.startsWith(q))||(a.n.length-b.n.length)).slice(0,20);
  acShow(box,list.map(c=>({c,html:`<span>${hl(c.n,q)}</span><span class="sub">${String(c.p||c.c).startsWith("14")?"山西":"河北"}</span>`})),it=>{$("#qCounty").value=it.c.n;$("#qVillage").value="";onCounty();setTimeout(()=>$("#qVillage").focus(),50);});}
$("#qVillage").addEventListener("input",acVillage);$("#qVillage").addEventListener("focus",acVillage);
$("#qCounty").addEventListener("input",acCounty);$("#qCounty").addEventListener("focus",acCounty);
document.addEventListener("click",e=>{if(!e.target.closest(".acw"))document.querySelectorAll(".ac").forEach(b=>b.classList.add("hidden"));});
$("#qCounty").addEventListener("change",onCounty);$("#qCounty").addEventListener("blur",()=>setTimeout(onCounty,200));
$("#tryEx").onclick=e=>{e.preventDefault();$("#qCounty").value="赵县";$("#qVillage").value="东卜庄村";$("#qName").value="卜";onCounty();$("#q").onsubmit(e);};
$("#btnSearch").onclick=$("#homeBtn").onclick=()=>$("#landing").classList.remove("hidden");
$("#q").onsubmit=e=>{e.preventDefault();$("#landing").classList.add("hidden");const a=[$("#qCounty").value.trim(),$("#qVillage").value.trim(),$("#qName").value.trim()];history.replaceState(null,"","#q="+a.join(","));run(...a);};
function findVillage(c,v){if(!v)return null;const norm=s=>s.replace(/村$/,"");
  if(c&&c.n==="赵县"){const p=VIL.pilot.find(x=>norm(x.osm_name)===norm(v));if(p)return{n:p.osm_name,lat:p.lat,lon:p.lon,pilot:p};const o=VIL.others.find(x=>norm(x.n)===norm(v));if(o)return{n:o.n,lat:o.lat,lon:o.lon};}
  if(!PLACES)return null;const cand=PLACES.filter(p=>norm(p[0])===norm(v));
  const inC=c?cand.filter(p=>ptIn(p[2],p[1],c.r)):cand;const p=inC[0];return p?{n:p[0],lat:p[1],lon:p[2]}:null;}
function suggest(c,v){const key=v.replace(/村$/,"");const pool=c&&c.n==="赵县"?[...VIL.pilot.map(p=>p.osm_name),...VIL.others.map(o=>o.n)]:(c?PLACES.filter(p=>ptIn(p[2],p[1],c.r)).map(p=>p[0]):[]);
  const sc=n=>{const m=n.replace(/村$/,"");if(m.includes(key))return 3;let k=0;for(const ch of key)if(m.includes(ch))k++;return k/key.length;};
  return [...new Set(pool)].map(n=>[n,sc(n)]).filter(x=>x[1]>=.5).sort((a,b)=>b[1]-a[1]||a[0].length-b[0].length).slice(0,8).map(x=>x[0]);}
const kmTxt=d=>d<1?"不到 1 公里":d.toFixed(0)+" 公里";
function pilotLine(p,from){const sn=(p.history||"").replace(/^[^。]*?(该村|据传|相传)/,"$1");return `<div class="card"><b>${p.osm_name}</b> <span style="color:${COLORS[p.category]}">● ${CATNAME[p.category]}</span>${from?` <span class="sub">离你们村 ${kmTxt(km(from,[p.lat,p.lon]))}</span>`:""}<br>${esc(sn.length>110?sn.slice(0,110)+"……":sn)}<div class="sub">${p.evidence} ${CONF[p.confidence]}</div></div>`;}
const SX_SRC={"洪洞":[36.270,111.672],"太原":[37.87,112.55],"阳曲":[38.06,112.67],"平定":[37.79,113.63],"繁峙":[39.19,113.27],"泽州":[35.49,112.85],"潞州":[36.19,113.11]};
const RC={local:"#2e6b3a",hongdong:"#a8322a",shanxi:"#b8892f",branch:"#0f766e",junhu:"#6b4f8a"};
let ROUTESET=[],HERE=null;
function lineCurve(a,b,color,dashed,particles){const c=ctrl(a,b),pts=[];for(let i=0;i<=30;i++)pts.push(bez(a,c,b,i/30));
  L.polyline(pts,{renderer:sv,color,weight:2,opacity:dashed?.8:.55,dashArray:dashed?"5 6":null,interactive:false}).addTo(flows);
  if(particles)for(let j=0;j<particles;j++)parts.push({m:L.circleMarker(a,{renderer:sv,radius:2.6,stroke:false,fillColor:color,fillOpacity:.9,interactive:false}).addTo(flows),a,c,b,t:Math.random(),v:.003+Math.random()*.004});}
function drawRoutes(only){refs.clearLayers();flows.clearLayers();parts=[];map.closePopup();const pts=[HERE];setLayer("zx",false);
  ROUTESET.forEach((r,i)=>{if(only!=null&&only!==i)return;r.draw(pts);});
  document.querySelectorAll(".route").forEach((e,i)=>e.classList.toggle("dim",only!=null&&only!==i));
  fly(L.latLngBounds(pts).pad(.12));}
function nearestDocs(here,n){return Object.keys(DST).filter(k=>k!=="赵县"&&DPOP[k]).map(k=>[k,km(here,DST[k])]).sort((a,b)=>a[1]-b[1]).slice(0,n);}
const T=(s,cls)=>`<span class="rtag ${cls||""}">${s}</span>`;

function run(cName,vName,sName){
  const box=$("#tab-result");box.innerHTML="<p>查询中…</p>";$("#sheet").classList.remove("min");
  const slow=setTimeout(()=>{if(/查询中/.test(box.textContent))box.innerHTML="<p>查询中…（第一次打开要下载约 1MB 的村名数据，网慢的话要等一会儿）</p>";},4000);
  const go=()=>{clearTimeout(slow);try{runInner(cName,vName,sName,box);}catch(err){box.innerHTML=`<p>出错了：${esc(err.message)}</p><p class="sub">截图发给泪桥，或者刷新再试。</p>`;console.error(err);}};
  const waitC=()=>COUNTIES.length?loadPlaces().then(go):setTimeout(waitC,300);waitC();
}
function runInner(cName,vName,sName,box){
  {
    const c=COUNTIES.find(x=>x.n===cName)||COUNTIES.find(x=>cName&&x.n.startsWith(cName));
    const v=findVillage(c,vName);const s=sName?sName[0]:"";
    const cc=v?(countyOf(v.lat,v.lon)||c):c;const isZX=cc&&cc.n==="赵县";
    const here=v?[v.lat,v.lon]:(cc?[cc.ct[1],cc.ct[0]]:null);HERE=here;
    const hereName=v?v.n:(cc?cc.n:"");const mine=v&&v.pilot;
    if(me)map.removeLayer(me);setLayer("surname",false);
    if(vName&&!v){const sg=c?suggest(c,vName):[];
      box.innerHTML=`<h2>${c?esc(c.n)+"里":""}没找到「${esc(vName)}」</h2>`+(sg.length?`<p>是不是这几个：</p><p>${sg.map(n=>`<span class="chip sug">${esc(n)}</span>`).join("")}</p>`:"")+`<p class="sub">村名来自 OpenStreetMap，可能缺村或者写法不同。${c?"":"也没认出「"+esc(cName)+"」这个县，换个写法试试。"}</p>`;
      box.querySelectorAll(".sug").forEach(e=>e.onclick=()=>{$("#qVillage").value=e.textContent;history.replaceState(null,"","#q="+[cName,e.textContent,sName].join(","));run(cName,e.textContent,sName);});
      if(c)fly([[c.bb[1],c.bb[0]],[c.bb[3],c.bb[2]]]);return;}
    if(!here){box.innerHTML=`<h2>没找到「${esc(cName)}」</h2><p>换个写法试试（带不带「县」字都可以）。</p>`;return;}
    me=L.marker(here,{icon:L.divIcon({className:"me",html:s?esc(s):"村",iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000}).bindPopup(`<b>${esc(hereName)}</b>`).addTo(map);
    const inShanxi=cc&&String(cc.p||cc.c).startsWith("14");
    const SN=(s&&SURN[s])||[];
    const sameS=s?surnamePlaces(s).map(p=>[p,km(here,[p[1],p[2]])]).filter(x=>x[1]>.3&&x[1]<45).sort((a,b)=>a[1]-b[1]):[];
    const mySet=mine?(mine.settlers||[]).filter(x=>x.origin&&(!s||(x.surname||"").includes(s))):[];
    const known=mySet.length?Object.assign({},mine,{origin:mySet[0].origin}):null;
    const knownKind=known?(/洪洞/.test(known.origin)?"hongdong":/山西/.test(known.origin)?"shanxi":/安徽|南直隶|山东|河南/.test(known.origin)?"junhu":"branch"):null;
    const surnameElsewhere=s&&mine&&!mySet.length&&(mine.settlers||[]).some(x=>x.origin);
    ROUTESET=[];
    // 1 洪洞
    if(!inShanxi){const ev=[];
      if(known&&/洪洞/.test(known.origin))ev.push(`<b>${known.osm_name}的记载：</b>${esc(known.history)} <span class="sub">${known.evidence}</span> ${CONF[known.confidence]}`);
      for(const r of SN.filter(r=>/洪洞/.test(r.t)&&!(v&&(r.place.endsWith(v.n)||(mine&&r.place==="赵县"+mine.book)))).sort((a,b)=>km(here,[a.lat,a.lon])-km(here,[b.lat,b.lon])))ev.push(`${r.t} <span class="sub">离你们 ${kmTxt(km(here,[r.lat,r.lon]))} · ${r.src}</span> ${CONF[r.cf]||""}`);
      if(isZX){ev.push(`《赵县地名资料汇编》里，记有明初从山西迁来的村 ${ZXSTAT.nShanxi} 个，其中写明洪洞的 ${(ZXSTAT.sxCounties.find(x=>x[0]==="洪洞")||[0,0])[1]} 个。<span class="sub">书后附录《赵州明永乐迁民纪略》：「明永乐二年、十四年都曾迁山西之民以实河北」。</span>`);const nb=VIL.pilot.filter(p=>/洪洞/.test(p.origin||"")&&p!==mine&&p.book!==(mine&&mine.book)).map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,2);
        if(nb.length)ev.push("附近有记载从洪洞来的村："+nb.map(([p,d])=>`${p.osm_name}（${p.surname}氏，${kmTxt(d)}）`).join("、"));}
      const nd=nearestDocs(here,1)[0];if(nd)ev.push(`离你们最近的有记载的县：${nd[0]}（${kmTxt(nd[1])}）——${DPOP[nd[0]]}`);
      ev.push("北方很多家族都有「山西洪洞大槐树」的说法。学者指出其中一部分是后来认下来的共同记忆。");
      ROUTESET.push({k:"hongdong",ttl:"明初从山西洪洞迁来",era:"1368–1424",tag:knownKind==="hongdong"?T("有记载","ok"):T("最常见的说法"),ev,gp:"族谱始祖一栏写「自山西洪洞某村迁来」。",
        draw(pts){lineCurve(SRC["洪洞"],here,RC.hongdong,false,8);refMark(SRC["洪洞"][0],SRC["洪洞"][1],"洪洞","<b>洪洞 · 大槐树</b>",RC.hongdong);pts.push(SRC["洪洞"]);}});}
    // 2 山西其他州县
    if(!inShanxi){const ev=[];const srcs=["太原","平定","泽州","潞州","阳曲","繁峙"];
      if(knownKind==="shanxi")ev.push(`<b>${known.osm_name}的记载：</b>${esc(known.history)} <span class="sub">${known.evidence}</span> ${CONF[known.confidence]}`);
      if(isZX){const oc=ZXSTAT.sxCounties.filter(x=>x[0]!=="洪洞").map(([k,n])=>`${k==="未写县名"?"只写山西":k==="柴村"?"柴村（未写县）":k} ${n}`).join("、");ev.push(`赵县本县的记载里，除了洪洞，还写着：${oc}（个村）。例如苏家疃田氏「大明永乐辛卯年（1411）自山西沁源县奉旨迁至赵州苏家疃」（《田氏墓碑记》）。<span class="sub">明隆庆《赵州志》：「永乐间迁山西屯留、长子等民实之」。</span>`);
        const nb2=VIL.pilot.filter(p=>p.category==="shanxi_min"&&p.book!==(mine&&mine.book)).map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,2);if(nb2.length)ev.push("离你们最近的："+nb2.map(([p,d])=>`${p.osm_name}（${p.origin}，${kmTxt(d)}）`).join("、"));}
      else ev.push("明初迁民不只来自洪洞。邻近县的记载里，迁出地还有太原、阳曲、繁峙、平定、泽州、潞州等。<span class='sub'>《赞皇地名资料汇编》（1983）、傅振伦《新河县迁民调查》</span>");
      if(s==="郝")ev.push("郝姓郡望是「太原郝氏」，从太原一带迁来也说得通。<span class='sub'>传统说法</span>");
      ROUTESET.push({k:"shanxi",ttl:"明初从山西别的州县迁来",era:"1368–1424",tag:knownKind==="shanxi"?T("有记载","ok"):T("常见"),ev,gp:"族谱写的是山西别的县名（如太原、平定、泽州）。",
        draw(pts){for(const n of srcs){const p=SX_SRC[n];lineCurve(p,here,RC.shanxi,false,n==="太原"&&s==="郝"?6:3);refMark(p[0],p[1],n,`<b>${n}</b><br>明初迁民的迁出地之一`,RC.shanxi);pts.push(p);}}});}
    // 3 附近同姓村分出
    if(sameS.length||knownKind==="branch"){const top=sameS.slice(0,4);const ev=[];
      if(sameS.length)ev.push(`离你们 45 公里内，名字以「${esc(s)}」开头的村有 ${sameS.length} 个：`+top.map(([p,d])=>`${esc(p[0])}（${kmTxt(d)}）`).join("、")+"。");
      if(knownKind==="branch")ev.push(`<b>${known.osm_name}的记载：</b>${esc(known.history)} <span class="sub">${known.evidence}</span> ${CONF[known.confidence]}`);
      ev.push("华北常见的情况：先迁来的一支在某村落脚，人多了以后兄弟分家，另立新村。这些同姓村可能是你家的母村，也可能是同宗的另一支。");
      if(isZX){const sm=VIL.pilot.filter(p=>s&&(p.surname||"").includes(s)&&p.origin&&p.book!==(mine&&mine.book)).map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,2);
        for(const[p,d]of sm)ev.push(`<b>${p.osm_name}（${kmTxt(d)}）：</b>${esc(p.history)} <span class="sub">${p.evidence}</span> ${CONF[p.confidence]}`);
        if(ZXSTAT.branch.length)ev.push(`赵县有记载从本地别的村分出来的例子：`+ZXSTAT.branch.slice(0,4).map(b=>`${b.v}${b.sur?"（"+b.sur+"氏）":""}自${b.from}迁来`).join("；")+"。");}
      ROUTESET.push({k:"branch",ttl:knownKind==="branch"?"从附近的村分出来":`从附近的${esc(s)}姓村分出来`,era:"明—清",tag:knownKind==="branch"?T("有记载","ok"):T("有线索"),ev,gp:`族谱始祖写的是本县或邻县的某个村，或者老人说跟${top[0]?esc(top[0][0][0]):""}是本家。`,
        draw(pts){const seen=new Set(top.map(([p])=>p[0]));
          if(isZX)for(const p of VIL.pilot.filter(p=>s&&(p.surname||"").includes(s)&&p.origin&&!seen.has(p.osm_name)&&p.book!==(mine&&mine.book))){seen.add(p.osm_name);lineCurve([p.lat,p.lon],here,RC.branch,true,0);refMark(p.lat,p.lon,p.osm_name,pilotHtml(p),RC.branch);pts.push([p.lat,p.lon]);}
          for(const[p]of top){if(isZX){const pv=VIL.pilot.find(x=>x.osm_name===p[0]);if(pv){lineCurve([pv.lat,pv.lon],here,RC.branch,true,0);refMark(pv.lat,pv.lon,pv.osm_name,pilotHtml(pv),RC.branch);pts.push([pv.lat,pv.lon]);continue;}}lineCurve([p[1],p[2]],here,RC.branch,true,0);refMark(p[1],p[2],p[0],`<b>${esc(p[0])}</b><br>名字以「${esc(s)}」开头的村，离你们 ${kmTxt(km(here,[p[1],p[2]]))}`,RC.branch);pts.push([p[1],p[2]]);}}});}
    // 4 本地老户
    {const ev=[];let tag=T("可能");
      if(mine&&mine.category==="pre_ming"){ev.push(`<b>${mine.osm_name}这个村明代以前就有（${mine.era}）。</b>${mySet.length?`但书里写${s||""}姓是后来迁来的，见上面那条。`:(surnameElsewhere?`书里记的迁入姓氏没有${s}姓，${s}家可能是村里的老户。`:"")} <span class="sub">${mine.evidence}</span> ${CONF[mine.confidence]}`);if(!mySet.length)tag=T("村子有记载","ok");}
      if(isZX){const pre=VIL.pilot.filter(p=>p.category==="pre_ming"&&p!==mine).map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,3);
        ev.push(`赵县书里的 ${ZXSTAT.n} 个村，${ZXSTAT.cats.pre_ming} 个写着明代以前就有。离你们最近的：`+pre.map(([p,d])=>`${p.osm_name}（${kmTxt(d)}，${p.era}）`).join("、")+"。");}
      else ev.push("元末华北人口大减，但没有全空，很多县都有明代以前的古村。");
      ev.push("所以也可能是本地老户，元末战乱里留下来的。");
      ROUTESET.push({k:"local",ttl:"本来就是本地人",era:"明以前",tag,ev,gp:"族谱没写从哪迁来，或者写的始祖年代早于明朝。",
        draw(pts){L.circle(here,{radius:9000,color:RC.local,weight:1.5,dashArray:"4 4",fillColor:RC.local,fillOpacity:.08,interactive:false}).addTo(refs);
          if(isZX)for(const p of VIL.pilot.filter(p=>p.category==="pre_ming").map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,3)){refMark(p[0].lat,p[0].lon,p[0].osm_name,pilotHtml(p[0]),RC.local);pts.push([p[0].lat,p[0].lon]);}
          pts.push([here[0]-.1,here[1]-.12],[here[0]+.1,here[1]+.12]);}});}
    // 5 军户
    if(!inShanxi&&isZX){const ex=VIL.pilot.find(p=>p.book==="东晏头");const tk=VIL.pilot.filter(p=>p.category==="tunken"||p.category==="other_prov").map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,3);
      ROUTESET.push({k:"junhu",ttl:"明初作为军户或外地人迁来",era:"洪武—宣德",tag:T("少见"),ev:[`明隆庆《赵州志》：「永乐、宣德等年乃拨神武右卫左千户等所军余屯种，每一屯计卒二三十名……如扬扈、柏舍诸屯是也。」`,
        `也有不是山西来的：东晏头陈氏原籍南直隶蒙城（今安徽），洪武中为燕山右卫护军；许家郭许氏自安徽歙县黑虎庄迁来。`].concat(tk.length?["离你们最近的屯垦或外来村："+tk.map(([p,d])=>`${p.osm_name}（${kmTxt(d)}）`).join("、")]:[]),gp:"族谱里提到某卫、某所、袭职、军籍，或者原籍不在山西。",
        draw(pts){if(ex){refMark(ex.lat,ex.lon,"东晏头（军户）",pilotHtml(ex),RC.junhu);pts.push([ex.lat,ex.lon]);}for(const[p]of tk){refMark(p.lat,p.lon,p.osm_name,pilotHtml(p),RC.junhu);pts.push([p.lat,p.lon]);}}});}
    // order: known first; if one route is documented for this village, mark the rest as less likely
    ROUTESET.sort((a,b)=>(/ok/.test(b.tag)?1:0)-(/ok/.test(a.tag)?1:0));
    if(ROUTESET.some(r=>/ok/.test(r.tag)))ROUTESET.forEach(r=>{if(!/ok/.test(r.tag)){r.tag=T("可能性小");r.weak=true;}});
    let h=`<h2>${esc(hereName)}${s?` · ${esc(s)}家`:""}</h2><div class="sub">${cc?esc(cc.n):""}${isZX?" · 明代属真定府赵州":""}</div>`;
    if(mine)h+=`<h3>书里怎么写你们村</h3><div class="card">${esc(mine.history)}<div class="sub">${mine.evidence} ${CONF[mine.confidence]}${mine.page?` · 原书第 ${mine.page} 页`:""}</div></div>`;else if(isZX&&v)h+=`<p class="sub">《赵县地名资料汇编》（1984）里没有「${esc(v.n)}」的单独条目。</p>`;
    h+=`<div class="disc">下面是记载和可能，不是你家的定论。你家具体从哪来，以自家族谱为准。</div>`;
    h+=`<h3>可能的来路（${ROUTESET.length} 种）</h3><p class="sub">没有族谱也没关系，下面是按现有记载推出的几种可能。点一种，地图上只看这一条；<a class="lnk" id="allR">看全部</a></p>`;
    h+=ROUTESET.map((r,i)=>`<div class="route${r.weak?" weak":""}" data-i="${i}" style="--rc:${RC[r.k]}"><div class="rt-h"><span class="rt-dot"></span><span class="rt-ttl">${r.ttl}</span>${r.tag}</div><div class="rt-era">${r.era}</div><ul>${r.ev.map(x=>`<li>${x}</li>`).join("")}</ul><div class="rt-gp">族谱上看：${r.gp}</div></div>`).join("");
    if(s){const list=surnamePlaces(s);const byP={};for(const p of list){const pr=provOf(p[1],p[2]);byP[pr]=(byP[pr]||0)+1;}
      h+=`<h3>${esc(s)}姓村子的分布</h3><p>冀晋鲁豫京津名字以「${esc(s)}」开头的村一共 <b>${list.length}</b> 个：`+["河北","山西","山东","河南","北京","天津"].filter(k=>byP[k]).map(k=>`${k} ${byP[k]}`).join("，")+`。<a class="lnk" id="showSN">在地图上看</a></p><p class="sub">以某字开头的村不一定是该姓建的，只是线索。</p>`;}
    h+=`<h3>家里能确认的</h3><div class="card"><div class="kv"><b>始祖</b><span class="q">？</span></div><div class="kv"><b>迁自</b><span class="q">？</span></div><div class="kv"><b>年代</b><span class="q">？</span></div><div class="kv"><b>字辈</b><span class="q">？</span></div></div><p class="sub">有族谱或老人口述，就能从上面几种里挑出真的那条。${v&&!v.pilot?(isZX?"":"这个县的逐村来历还没开始整理。"):""}</p>`;
    box.innerHTML=h;box.scrollTop=0;
    box.querySelectorAll(".route").forEach(e=>e.onclick=()=>drawRoutes(+e.dataset.i));
    $("#allR").onclick=ev=>{ev.stopPropagation();drawRoutes(null);};
    if($("#showSN"))$("#showSN").onclick=()=>{refs.clearLayers();flows.clearLayers();parts=[];showSurname(s);fly(NORTH);};
    if(PLACES_ERR&&!PLACES)box.insertAdjacentHTML("beforeend",`<p class="sub">村名数据没下载下来（${esc(PLACES_ERR)}），同姓村部分暂时缺失。刷新可以重试。</p>`);
    const only=new URLSearchParams(location.search).get("route");drawRoutes(only==null?null:+only);
  }
}
const NORTH=[[34.6,111.0],[40.3,118.0]];
(function(){const m=decodeURIComponent(location.hash).match(/^#q=([^,]*),([^,]*),?(.*)$/);if(m){$("#qCounty").value=m[1];$("#qVillage").value=m[2];$("#qName").value=m[3];$("#landing").classList.add("hidden");run(m[1],m[2],m[3]);}})();
$("#tab-result").innerHTML=`<p>在首页输入县、村、姓查询。</p><p><a class="lnk" onclick="document.querySelector('#landing').classList.remove('hidden')">去查询 →</a></p>`;
