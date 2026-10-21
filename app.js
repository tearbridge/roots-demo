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
const cities=L.layerGroup().addTo(map), cityLbls=[];
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
const LAY={terrain,rivers,bounds,ming,flows,zx:zxLayer,surname};
const want=k=>$(`#layersPanel input[data-l="${k}"]`).checked;
function setLayer(k,on){$(`#layersPanel input[data-l="${k}"]`).checked=on;applyLayers();}
function applyLayers(){for(const k in LAY){if(k==="zx")continue;want(k)?LAY[k].addTo(map):map.removeLayer(LAY[k]);}zoomSync();}
document.querySelectorAll("#layersPanel input").forEach(cb=>cb.onchange=applyLayers);
$("#btnLayers").onclick=()=>{$("#about").classList.add("hidden");$("#layersPanel").classList.toggle("hidden");};
$("#btnAbout").onclick=()=>{$("#layersPanel").classList.add("hidden");$("#about").classList.toggle("hidden");};
document.querySelectorAll("[data-close]").forEach(a=>a.onclick=()=>$("#"+a.dataset.close).classList.add("hidden"));

// ---------- sheet & tabs ----------
function tab(t){document.querySelectorAll(".tabs a").forEach(a=>a.classList.toggle("on",a.dataset.tab===t));document.querySelectorAll(".tab").forEach(d=>d.classList.add("hidden"));$("#tab-"+t).classList.remove("hidden");$("#sheet").classList.remove("min");
  if(t==="time"&&curPhase<0)phase(0);}
document.querySelectorAll(".tabs a").forEach(a=>a.onclick=()=>tab(a.dataset.tab));
$("#grab").onclick=()=>$("#sheet").classList.toggle("min");
const sheetH=()=>$("#sheet").offsetHeight;
function fly(b,maxZ){map.flyToBounds(b,{paddingTopLeft:[16,50],paddingBottomRight:[16,sheetH()+10],duration:1.1,maxZoom:maxZ||13});}

// ---------- timeline ----------
const ZX=[[37.62,114.60],[37.92,115.02]],NORTH=[[34.6,111.0],[40.3,118.0]];
const PH=[
 {k:"1167",t:"1167 年以前",h:"赵县早就有村子",b:`<p>金大定七年（1167）《大金沃州柏林禅院三千邑众碑记》记有董村、堰头村等村名，这些村今天还在。固城村是西汉平棘县治，前 174 年置县。</p><p>赵县已整理的 24 个村里，11 个（绿色）明代以前就有。</p>`,v:ZX,f:[],show:["pre_ming"],ming:false},
 {k:"元末",t:"元末 · 1350–1368",h:"华北人口大减",b:`<p>元末战乱、黄河决口、旱蝗、瘟疫，华北平原人口大减。山西有太行山阻隔，受战乱较少，人口相对稠密。</p><p class="sub">看地形：西边山西是高原，东边河北是平原。</p>`,v:NORTH,f:[],show:[],ming:false},
 {k:"洪武",t:"洪武 · 1368–1398",h:"从山西往外迁民",b:`<p>洪武年间朝廷多次从山西迁民到今河北、山东、河南屯垦。学者估计明初山西迁出约百万人。</p><p>河北枣强是二次分发点，山东北部很多村记载「自枣强迁来」。点城市看各县资料。</p><p class="sub">曹树基《中国移民史·明时期》</p>`,v:NORTH,f:["hongwu"],show:[],ming:true},
 {k:"靖难",t:"靖难 · 1399–1402",h:"燕王扫北",b:`<p>燕王朱棣起兵夺位，战事主要在今河北、山东一带，打了四年。河北民间说的「燕王扫北」就是这件事。</p><p>定县社会调查里，多数村说自己是燕王扫北后从山西洪洞迁来的。</p><p class="sub">李景汉《定县社会概况调查》</p>`,v:NORTH,f:[],show:[],ming:true,shade:true},
 {k:"永乐",t:"永乐 · 1403–1424",h:"充实北京周边，迁入赵县",b:`<p>永乐年间继续迁民，重点充实北京周边。赵县这一时期有移民迁入，也有军队屯垦建村。</p><p>《赵州乡土志》：卜氏「明永乐年间，自山西洪洞县迁至郡西卜家庄」。红色 5 村为山西迁来，黄色 4 村为屯垦建村。</p><p class="sub">清光绪《赵州乡土志》；80 年代赵县村名资料</p>`,v:NORTH,f:["yongle"],show:["hongdong_min","tunken"],ming:true,then:ZX},
 {k:"今天",t:"今天",h:"全部图层",b:`<p>赵县 265 个村里，24 个整理了来历，其余白点还没有。补齐需要 1984 年《赵县地名资料汇编》。</p>`,v:NORTH,f:["hongwu","yongle"],show:"all",ming:false}
];
let curPhase=-1;const shade=L.polygon(GEO["河北"].map(ll),{pane:"pBounds",stroke:false,fillColor:"#a8322a",fillOpacity:.14,interactive:false});
$("#phases").innerHTML=PH.map((p,i)=>`<span class="chip" data-i="${i}">${p.k}</span>`).join("");
document.querySelectorAll("#phases .chip").forEach(c=>c.onclick=()=>phase(+c.dataset.i));
function phase(i){curPhase=i;const p=PH[i];
  document.querySelectorAll("#phases .chip").forEach((c,j)=>c.classList.toggle("on",j===i));
  $("#phaseBody").innerHTML=`<div class="sub" style="color:#a8322a">${p.t}</div><h2>${p.h}</h2>${p.b}<p style="margin-top:8px">${i>0?`<a class="lnk" onclick="phase(${i-1})">← 上一段</a>　`:""}${i<PH.length-1?`<a class="lnk" onclick="phase(${i+1})">下一段 →</a>`:""}</p>`;
  setFlows(p.f);setLayer("flows",true);setLayer("ming",!!p.ming);
  pilotMk.forEach(m=>{const vis=p.show==="all"||p.show.includes(m.cat);m.setStyle({fillOpacity:vis?1:.18,opacity:vis?1:.18});});
  p.shade?shade.addTo(map):map.removeLayer(shade);
  map.closePopup();fly(p.v);
  if(p.then)setTimeout(()=>{if(curPhase===i)fly(p.then);},3000);
}

// ---------- search / result ----------
let me=null;
function onCounty(){const name=$("#qCounty").value.trim();const c=COUNTIES.find(x=>x.n===name)||COUNTIES.find(x=>name&&x.n.startsWith(name));const dl=$("#dlVillage");dl.innerHTML="";
  if(!c)return;const add=v=>{const o=document.createElement("option");o.value=v;dl.appendChild(o);};
  if(c.n==="赵县"){for(const v of VIL.pilot)add(v.osm_name);for(const v of VIL.others)add(v.n);}
  else loadPlaces().then(()=>{const[a,b,cc,d]=c.bb;for(const p of PLACES)if(p[2]>=a&&p[2]<=cc&&p[1]>=b&&p[1]<=d&&ptIn(p[2],p[1],c.r))add(p[0]);});}
$("#qCounty").addEventListener("change",onCounty);
$("#tryEx").onclick=e=>{e.preventDefault();$("#qCounty").value="赵县";$("#qVillage").value="东卜庄村";$("#qName").value="卜";onCounty();$("#q").requestSubmit();};
$("#justMap").onclick=e=>{e.preventDefault();$("#landing").classList.add("hidden");tab("time");phase(0);};
$("#btnSearch").onclick=$("#homeBtn").onclick=()=>$("#landing").classList.remove("hidden");
$("#q").onsubmit=e=>{e.preventDefault();$("#landing").classList.add("hidden");run($("#qCounty").value.trim(),$("#qVillage").value.trim(),$("#qName").value.trim());};

function findVillage(c,v){if(!v)return null;const norm=s=>s.replace(/村$/,"");
  if(c&&c.n==="赵县"){const p=VIL.pilot.find(x=>norm(x.osm_name)===norm(v));if(p)return{n:p.osm_name,lat:p.lat,lon:p.lon,pilot:p};const o=VIL.others.find(x=>norm(x.n)===norm(v));if(o)return{n:o.n,lat:o.lat,lon:o.lon};}
  if(!PLACES)return null;const cand=PLACES.filter(p=>norm(p[0])===norm(v));
  const inC=c?cand.filter(p=>ptIn(p[2],p[1],c.r)):cand;const p=(inC[0]||cand[0]);return p?{n:p[0],lat:p[1],lon:p[2]}:null;}

function run(cName,vName,sName){
  $("#tab-result").innerHTML="<p>查询中…</p>";tab("result");
  loadPlaces().then(()=>{
    const c=COUNTIES.find(x=>x.n===cName)||COUNTIES.find(x=>cName&&x.n.startsWith(cName));
    const v=findVillage(c,vName);
    if(me)map.removeLayer(me);
    let h="";
    // village
    if(v){me=L.marker([v.lat,v.lon],{icon:L.divIcon({className:"me",html:sName?esc(sName[0]):"村",iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000}).addTo(map);
      const cc=c||countyOf(v.lat,v.lon);
      h+=`<h2>${esc(v.n)}</h2><div class="sub">${cc?esc(cc.n):""}${cc&&cc.n==="赵县"?" · 明代属真定府赵州":""} · 北纬 ${v.lat.toFixed(2)}° 东经 ${v.lon.toFixed(2)}°</div>`;
      h+=`<h3>这个村的来历</h3>`;
      if(v.pilot){const p=v.pilot;h+=`<div class="card"><div class="kv"><b>类别</b><span style="color:${COLORS[p.category]}">● ${CATNAME[p.category]}</span></div>`+(p.era?`<div class="kv"><b>年代</b>${p.era}</div>`:"")+(p.surname?`<div class="kv"><b>姓氏</b>${p.surname}${p.origin?`，来自${p.origin}`:""}</div>`:"")+(p.note?`<div class="kv"><b>备注</b>${p.note}</div>`:"")+`<div class="kv"><b>依据</b><span>${p.evidence} ${CONF[p.confidence]}</span></div></div>`;}
      else h+=`<div class="card">还没整理到。${cc&&cc.n==="赵县"?"赵县需要 1984 年《赵县地名资料汇编》。":"这个县的逐村来历还没开始整理。"}</div>`;
      
      if(cc&&cc.n==="赵县"){const cnt={};for(const p of VIL.pilot)cnt[p.category]=(cnt[p.category]||0)+1;
        h+=`<h3>赵县已整理的 24 个村</h3>`+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).map(k=>`<div class="bar"><span class="l"><span class="dot" style="background:${COLORS[k]}"></span>${CATNAME[k]}</span><span class="t" style="width:${cnt[k]*12}px;background:${COLORS[k]}"></span><span class="n">${cnt[k]}</span></div>`).join("")+`<p class="sub">还有 241 个村没整理。</p>`;}
      fly([[v.lat-.06,v.lon-.08],[v.lat+.06,v.lon+.08]],12.5);setTimeout(()=>zoomSync(),1300);
    } else if(vName){h+=`<h2>没找到「${esc(vName)}」</h2><p>换个写法试试（带不带「村」字都可以），或者先只查姓。</p>`;}
    // surname
    if(sName){const s=sName[0];const list=showSurname(s);const byP={};for(const p of list){const pr=provOf(p[1],p[2]);byP[pr]=(byP[pr]||0)+1;}
      h+=`<h3>名字以「${esc(s)}」开头的村</h3><p>冀晋鲁豫京津一共 <b>${list.length}</b> 个：`+["山西","河北","山东","河南","北京","天津"].filter(k=>byP[k]).map(k=>`${k} ${byP[k]}`).join("，")+`。地图上青绿色点。</p>`;
      if(v&&list.length){const near=list.map(p=>[p,km([v.lat,v.lon],[p[1],p[2]])]).filter(x=>x[1]>0.3).sort((a,b)=>a[1]-b[1]).slice(0,5);
        h+=`<p>离你们村最近的：</p><ul class="near">`+near.map(([p,d])=>`<li><a class="lnk" onclick="map.flyTo([${p[1]},${p[2]}],13)">${esc(p[0])}</a> <span class="sub">${d.toFixed(0)} 公里</span></li>`).join("")+`</ul>`;}
      const notes=SURN[s];if(notes){h+=`<h3>文献里的${esc(s)}姓</h3>`+notes.map(([t,src,cf])=>`<div class="card">${t}<div class="sub">${src} ${CONF[cf]||""}</div></div>`).join("");}
      h+=`<p class="sub">以某字开头的村不一定是该姓建的，只是线索。</p>`;}
    // family
    h+=`<h3>你家的族谱</h3><div class="card"><div class="kv"><b>始祖</b><span class="q">？</span></div><div class="kv"><b>迁自</b><span class="q">？县 ？村</span></div><div class="kv"><b>年代</b><span class="q">？</span></div><div class="kv"><b>字辈</b><span class="q">？</span></div></div><p class="sub">这几项要看家里的族谱或老人口述。以后支持上传族谱照片。</p>`;
    h+=`<p style="margin-top:10px"><a class="lnk" onclick="tab('time')">看明初迁民的时间线 →</a></p>`;
    $("#tab-result").innerHTML=h;
    if(!v&&sName)fly(NORTH);
  });
}
// deep link: #q=赵县,泥沟村,郝
(function(){const m=decodeURIComponent(location.hash).match(/^#q=([^,]*),([^,]*),?(.*)$/);if(m){$("#qCounty").value=m[1];$("#qVillage").value=m[2];$("#qName").value=m[3];$("#landing").classList.add("hidden");run(m[1],m[2],m[3]);}
 else if(/^#(map|t=\d)/.test(location.hash)){$("#landing").classList.add("hidden");tab("time");phase(+(location.hash.match(/t=(\d)/)||[0,0])[1]);}
})();
$("#tab-result").innerHTML=`<p>在首页输入县、村、姓查询。</p><p><a class="lnk" onclick="document.querySelector('#landing').classList.remove('hidden')">去查询 →</a></p>`;
