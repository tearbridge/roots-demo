// 华北村庄来历图 · 试作版
const COLORS={pre_ming:"#2e6b3a",hongdong_min:"#a8322a",tunken:"#b8892f",ming_local:"#4f6d8a",junhu:"#6b4f8a",unknown:"#999"};
const CATNAME={pre_ming:"明代以前已有",hongdong_min:"明初山西迁来",tunken:"永乐屯垦建村",ming_local:"明代本地形成",junhu:"明初军户迁来",unknown:"年代不详"};
const CONF={T:'<span class="tag tC">传统说法</span>',A:'<span class="tag tA">A 碑刻/官修志书</span>',B:'<span class="tag tB">B 新编志书转引</span>',C:'<span class="tag tC">C 口传</span>'};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- map & panes ----------
const map=L.map("map",{zoomControl:false,minZoom:5,maxZoom:15,zoomSnap:.25,preferCanvas:true,maxBounds:[[30,104],[45,126]]}).setView([37.3,114.2],6.5);
map.attributionControl.setPrefix(false).addAttribution("© OpenStreetMap · DataV · 地形 AWS Terrain");
L.control.zoom({position:"bottomright"}).addTo(map);
[["pFill",200],["pTerrain",250],["pBounds",300],["pRivers",350],["pFlows",420],["pPts",450],["pLbl",520]].forEach(([n,z])=>{map.createPane(n).style.zIndex=z;});
map.getPane("pTerrain").style.pointerEvents="none";map.getPane("pLbl").style.pointerEvents="none";
const cv=L.canvas({pane:"pPts",padding:.3});

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
fetch("data/counties.json").then(r=>r.json()).then(d=>{COUNTIES=d;const dl=$("#dlCounty");for(const c of d){c.bb=bbox(c.r);for(const r of c.r)L.polyline(ll(r),{pane:"pBounds",color:"#a8916c",weight:.5,opacity:.7,interactive:false}).addTo(countyLines);const o=document.createElement("option");o.value=c.n;dl.appendChild(o);}onCounty();});
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
function zoomSync(){const z=map.getZoom();
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
(function tick(){for(const p of parts){p.t+=p.v;if(p.t>1)p.t=0;p.m.setLatLng(bez(p.a,p.c,p.b,p.t));p.m.setStyle({fillOpacity:Math.sin(p.t*Math.PI)});}requestAnimationFrame(tick);})();

// ---------- zhaoxian villages ----------
const zxLayer=L.layerGroup();
for(const o of VIL.others) L.circleMarker([o.lat,o.lon],{renderer:cv,radius:3,color:"#999",weight:1,fillColor:"#fff",fillOpacity:1}).bindPopup(`<b>${esc(o.n)}</b><br>来历还没整理。需要 1984 年《赵县地名资料汇编》。`).addTo(zxLayer);
const PILOT={},pilotMk=[];
function pilotHtml(v){return `<b>${v.osm_name}</b> <span style="color:${COLORS[v.category]}">● ${CATNAME[v.category]}</span><br>`+(v.era?`年代：${v.era}<br>`:"")+(v.surname?`姓氏：${v.surname}`+(v.origin?`，来自${v.origin}`:"")+"<br>":"")+(v.note?`${v.note}<br>`:"")+`依据：${v.evidence} ${CONF[v.confidence]}`;}
for(const v of VIL.pilot){PILOT[v.osm_name]=v;const m=L.circleMarker([v.lat,v.lon],{renderer:cv,radius:5.5,color:"#fbf6ea",weight:1.2,fillColor:COLORS[v.category],fillOpacity:1}).bindPopup(pilotHtml(v)).addTo(zxLayer);m.cat=v.category;pilotMk.push(m);}

// ---------- surname layer ----------
const surname=L.layerGroup();
function loadPlaces(){if(PLACES)return Promise.resolve(PLACES);return fetch("data/places.json").then(r=>r.json()).then(d=>{PLACES=d;$("#stPlaces").textContent=(d.length/10000).toFixed(1)+"万";return d;});}
const SN_RE=s=>new RegExp(`^[东西南北前后大小上下中新老]?${s}`);
function surnamePlaces(s){const re=SN_RE(s);return PLACES.filter(p=>!p[3]&&re.test(p[0]));}
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
function refMark(lat,lon,label,html,color){L.circleMarker([lat,lon],{renderer:cv,radius:6,color:"#fbf6ea",weight:1.5,fillColor:color||"#a8322a",fillOpacity:1}).bindPopup(html).addTo(refs);
  L.marker([lat,lon],{pane:"pLbl",icon:L.divIcon({className:"city key",html:esc(label),iconSize:null,iconAnchor:[-7,6]}),interactive:false}).addTo(refs);}

// ---------- search ----------
let me=null,STEPS=[];
function onCounty(){const name=$("#qCounty").value.trim();const c=COUNTIES.find(x=>x.n===name)||COUNTIES.find(x=>name&&x.n.startsWith(name));const dl=$("#dlVillage");dl.innerHTML="";
  if(!c)return;const add=v=>{const o=document.createElement("option");o.value=v;dl.appendChild(o);};
  if(c.n==="赵县"){for(const v of VIL.pilot)add(v.osm_name);for(const v of VIL.others)add(v.n);}
  else loadPlaces().then(()=>{const[a,b,cc,d]=c.bb;for(const p of PLACES)if(p[2]>=a&&p[2]<=cc&&p[1]>=b&&p[1]<=d&&ptIn(p[2],p[1],c.r))add(p[0]);});}
$("#qCounty").addEventListener("change",onCounty);
$("#tryEx").onclick=e=>{e.preventDefault();$("#qCounty").value="赵县";$("#qVillage").value="东卜庄村";$("#qName").value="卜";onCounty();$("#q").requestSubmit();};
$("#btnSearch").onclick=$("#homeBtn").onclick=()=>$("#landing").classList.remove("hidden");
$("#q").onsubmit=e=>{e.preventDefault();$("#landing").classList.add("hidden");const a=[$("#qCounty").value.trim(),$("#qVillage").value.trim(),$("#qName").value.trim()];history.replaceState(null,"","#q="+a.join(","));run(...a);};
function findVillage(c,v){if(!v)return null;const norm=s=>s.replace(/村$/,"");
  if(c&&c.n==="赵县"){const p=VIL.pilot.find(x=>norm(x.osm_name)===norm(v));if(p)return{n:p.osm_name,lat:p.lat,lon:p.lon,pilot:p};const o=VIL.others.find(x=>norm(x.n)===norm(v));if(o)return{n:o.n,lat:o.lat,lon:o.lon};}
  if(!PLACES)return null;const cand=PLACES.filter(p=>norm(p[0])===norm(v));
  const inC=c?cand.filter(p=>ptIn(p[2],p[1],c.r)):cand;const p=(inC[0]||cand[0]);return p?{n:p[0],lat:p[1],lon:p[2]}:null;}
const kmTxt=d=>d<1?"不到 1 公里":d.toFixed(0)+" 公里";
function pilotLine(p,from){return `<div class="card"><b>${p.osm_name}</b> <span style="color:${COLORS[p.category]}">● ${CATNAME[p.category]}</span>${from?` <span class="sub">离你们村 ${kmTxt(km(from,[p.lat,p.lon]))}</span>`:""}<br>${p.era||""}${p.surname&&p.origin?`；${p.surname}氏来自${p.origin}`:""}<div class="sub">${p.evidence} ${CONF[p.confidence]}</div></div>`;}
function showStep(i){const s=STEPS[i];if(!s)return;document.querySelectorAll(".step").forEach((e,j)=>e.classList.toggle("on",j===i));
  refs.clearLayers();flows.clearLayers();parts=[];setLayer("surname",false);map.closePopup();
  pilotMk.forEach(m=>m.setStyle({fillOpacity:1,opacity:1}));s.show&&s.show();}

function run(cName,vName,sName){
  const box=$("#tab-result");box.innerHTML="<p>查询中…</p>";$("#sheet").classList.remove("min");
  loadPlaces().then(()=>{
    const c=COUNTIES.find(x=>x.n===cName)||COUNTIES.find(x=>cName&&x.n.startsWith(cName));
    const v=findVillage(c,vName);const s=sName?sName[0]:"";
    const cc=v?(countyOf(v.lat,v.lon)||c):c;const isZX=cc&&cc.n==="赵县";
    const here=v?[v.lat,v.lon]:(cc?[cc.ct[1],cc.ct[0]]:null);
    const hereName=v?v.n:(cc?cc.n:"");
    if(me)map.removeLayer(me);
    if(here)me=L.marker(here,{icon:L.divIcon({className:"me",html:s?esc(s):"村",iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000}).bindPopup(`<b>${esc(hereName)}</b>`).addTo(map);
    const near=here?[[here[0]-.08,here[1]-.1],[here[0]+.08,here[1]+.1]]:null;
    const SN=(s&&SURN[s])||[];
    STEPS=[];
    // 姓氏源头
    const src=SN.filter(r=>r.era==="源头");
    if(src.length)STEPS.push({era:"姓氏源头",ttl:`${esc(s)}姓的老家`,h:src.map(r=>`<div class="card">${r.t}<div class="sub">${r.src} ${CONF[r.cf]||""}</div></div>`).join(""),show(){const pts=here?[here]:[];for(const r of src){refMark(r.lat,r.lon,r.place,`<b>${r.place}</b><br>${r.t}`,"#0f766e");pts.push([r.lat,r.lon]);}fly(L.latLngBounds(pts).pad(.3));}});
    // 明以前
    if(isZX){const pre=VIL.pilot.filter(p=>p.category==="pre_ming").map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]);
      const mine=v&&v.pilot;let h="";
      if(mine&&mine.category==="pre_ming")h+=`<p><b>${mine.osm_name}明代以前就有了。</b></p>`+pilotLine(mine);
      else if(mine)h+=`<p>${esc(hereName)}是${(mine.era||"明代").split(/[；，(（]/)[0]}才有的。在它之前，附近已经有这些村：</p>`+pre.slice(0,3).map(([p])=>pilotLine(p,here)).join("");
      else h+=`<p>${esc(hereName)}这时候有没有，还没查到。赵县这些村那时已经有了，离你们村最近的：</p>`+pre.slice(0,3).map(([p])=>pilotLine(p,here)).join("");
      STEPS.push({era:"明代以前",ttl:mine&&mine.category==="pre_ming"?"你们村早就有了":(mine?"建村以前，附近已有村子":"你们村附近早就有村子"),h,show(){for(const[p]of pre.slice(0,3))refMark(p.lat,p.lon,p.osm_name,pilotHtml(p),COLORS.pre_ming);fly(near,11.5);}});}
    // 明初
    {let h=`<p class="sub">背景：元末战乱后华北人口大减，明洪武、永乐年间朝廷多次从山西迁民到冀鲁豫，学者估计约百万人（曹树基《中国移民史·明时期》）。${isZX?"赵县当时是真定府赵州。":""}</p>`;let any=false;
      const mine=v&&v.pilot;
      if(mine&&(mine.category==="hongdong_min"||mine.category==="tunken")){h+=`<p><b>你们村就是这时候来的：</b></p>`+pilotLine(mine);any=true;}
      let mig=[];if(isZX){mig=VIL.pilot.filter(p=>(p.category==="hongdong_min"||p.category==="tunken")&&p!==mine).map(p=>[p,km(here,[p.lat,p.lon])]).sort((a,b)=>a[1]-b[1]).slice(0,3);
        if(mig.length){h+=`<p>你们附近有记载的明初移民村：</p>`+mig.map(([p])=>pilotLine(p,here)).join("");any=true;}}
      const snM=SN.filter(r=>(r.era==="明初"||r.era==="元末")&&!(v&&r.place.endsWith(v.n))).sort((a,b)=>here?km(here,[a.lat,a.lon])-km(here,[b.lat,b.lon]):0);
      if(snM.length){h+=`<p>文献里的${esc(s)}姓迁徙：</p>`+snM.map(r=>`<div class="card">${r.t}${here?` <span class="sub">离你们村 ${kmTxt(km(here,[r.lat,r.lon]))}</span>`:""}<div class="sub">${r.src} ${CONF[r.cf]||""}</div></div>`).join("");any=true;}
      if(any)STEPS.push({era:"明初 · 1368–1424",ttl:"这一带的人从哪来",h,show(){if(here)route(SRC["洪洞"],here,false);
        const pts=[here,SRC["洪洞"]].filter(Boolean);for(const[p]of mig){refMark(p.lat,p.lon,p.osm_name,pilotHtml(p),COLORS[p.category]);pts.push([p.lat,p.lon]);}
        for(const r of snM){refMark(r.lat,r.lon,r.place,`<b>${r.place}</b><br>${r.t}<br><span class='sub'>${r.src}</span>`,"#0f766e");pts.push([r.lat,r.lon]);}
        refMark(SRC["洪洞"][0],SRC["洪洞"][1],"洪洞（大槐树）","<b>洪洞 · 大槐树</b><br>传说中明初移民集合出发的地方。实际迁出地遍及山西多个州县。");
        fly(L.latLngBounds(pts).pad(.15));}});}
    // 你家
    if(v||s)STEPS.push({era:"你家",ttl:s?`${esc(hereName)}${esc(s)}家`:esc(hereName),h:`<div class="card"><div class="kv"><b>始祖</b><span class="q">？</span></div><div class="kv"><b>迁自</b><span class="q">？县 ？村</span></div><div class="kv"><b>年代</b><span class="q">？</span></div><div class="kv"><b>字辈</b><span class="q">？</span></div></div><p class="sub">这几项要看家里的族谱或老人口述。${v&&!v.pilot?(isZX?"你们村的来历还没整理到，需要 1984 年《赵县地名资料汇编》。":"这个县的逐村来历还没开始整理。"):""}</p>`,
      show(){if(here){route(SRC["洪洞"],here,true);refMark(SRC["洪洞"][0],SRC["洪洞"][1],"洪洞？","<b>洪洞？</b><br>虚线：待族谱确认。");fly(L.latLngBounds([here,SRC["洪洞"]]).pad(.2));}}});
    // 今天
    if(s){const list=surnamePlaces(s);const byP={};for(const p of list){const pr=provOf(p[1],p[2]);byP[pr]=(byP[pr]||0)+1;}
      const nearS=here?list.map(p=>[p,km(here,[p[1],p[2]])]).filter(x=>x[1]>.3).sort((a,b)=>a[1]-b[1]).slice(0,5):[];
      STEPS.push({era:"今天",ttl:`名字以「${esc(s)}」开头的村`,h:`<p>冀晋鲁豫京津一共 <b>${list.length}</b> 个：`+["河北","山西","山东","河南","北京","天津"].filter(k=>byP[k]).map(k=>`${k} ${byP[k]}`).join("，")+`。</p>`+(nearS.length?`<p>离你们村最近的：</p><ul class="near">`+nearS.map(([p,d])=>`<li>${esc(p[0])} <span class="sub">${kmTxt(d)}</span></li>`).join("")+`</ul>`:"")+`<p class="sub">名字以某字开头的村不一定是该姓建的，只是线索。</p>`,
        show(){showSurname(s);if(nearS.length)fly(L.latLngBounds([here,...nearS.map(([p])=>[p[1],p[2]])]).pad(.2));else fly(NORTH);}});}
    let h=v?`<h2>${esc(v.n)}${s?` · ${esc(s)}`:""}</h2><div class="sub">${cc?esc(cc.n):""}${isZX?" · 明代属真定府赵州":""}</div>`:(vName?`<h2>没找到「${esc(vName)}」</h2><p>换个写法试试（带不带「村」字都可以），或者只查姓。</p>`:`<h2>${esc(s)}姓</h2>`);
    h+=STEPS.map((st,i)=>`<div class="step" data-i="${i}"><div class="st-h"><span class="st-era">${st.era}</span><span class="st-ttl">${st.ttl}</span><span class="st-go">地图 ›</span></div><div class="st-b">${st.h}</div></div>`).join("");
    if(!STEPS.length)h+=`<p>这个县还没有整理到资料。可以输入姓，看同姓村的分布。</p>`;
    box.innerHTML=h;
    box.querySelectorAll(".step").forEach(e=>e.querySelector(".st-h").onclick=()=>showStep(+e.dataset.i));
    if(STEPS.length)showStep(Math.min(STEPS.length-1,+(new URLSearchParams(location.search).get("step")||0)));else if(here)fly(near,11.5);
  });
}
const NORTH=[[34.6,111.0],[40.3,118.0]];
(function(){const m=decodeURIComponent(location.hash).match(/^#q=([^,]*),([^,]*),?(.*)$/);if(m){$("#qCounty").value=m[1];$("#qVillage").value=m[2];$("#qName").value=m[3];$("#landing").classList.add("hidden");run(m[1],m[2],m[3]);}})();
$("#tab-result").innerHTML=`<p>在首页输入县、村、姓查询。</p><p><a class="lnk" onclick="document.querySelector('#landing').classList.remove('hidden')">去查询 →</a></p>`;
