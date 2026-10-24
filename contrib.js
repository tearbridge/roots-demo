// 各家的说法：同村同姓各自补充，按依据分级，不按人数投票
// 试作版：补充的内容存在本机浏览器（localStorage），换成后端时只需替换 Store
const ROOTS_C=(function(){
const LS="roots.ev.v1",ME="roots.me";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const myId=localStorage.getItem(ME)||(()=>{const id="u"+Math.random().toString(36).slice(2,9);localStorage.setItem(ME,id);return id;})();
const Store={
  all(){try{return JSON.parse(localStorage.getItem(LS)||"[]");}catch(e){return[];}},
  save(a){localStorage.setItem(LS,JSON.stringify(a));},
  add(e){const a=this.all();a.push(e);try{this.save(a);}catch(err){throw new Error("浏览器存储满了（照片太多或太大）。");}},
  remove(fn){this.save(this.all().filter(e=>!fn(e)));}};

const SX_LIST=["太原","阳曲","榆次","寿阳","平定","盂县","忻州","代州","繁峙","五台","汾州","平阳（临汾）","泽州（晋城）","潞州（长治）","屯留","长子","沁州","沁源","武乡","襄陵","其他县"];
const WX_LIST=["山东","河南","南直隶（今安徽、江苏）","北京","其他省"];
const WHEN=["明洪武年间","明永乐年间","明初（不清楚哪年）","明代中后期","清代","明代以前","不知道"];
const DIRS=[["hd","山西洪洞"],["sx","山西别的县"],["bx","本县或邻县别的村"],["wx","外省"],["bd","本地原有"]];
const TYPES=[["zupu","族谱"],["bei","碑刻"],["zhi","书里写的"],["oral","老人说的"],["heard","听说的"]];
const LV={4:["有原件","lv4"],3:["书里有记载","lv3"],2:["口传","lv2"],1:["只是听说","lv1"]};

function vByName(k){if(!k)return null;const n=k.replace(/村$/,"");return VIL.pilot.find(p=>p.book===n||p.book===k||p.osm_name===k||p.osm_name.replace(/村$/,"")===n);}
function parseOrigin(t){t=t.replace(/\s/g,"");
  if(/南直隶|安徽|山东|河南|江苏|浙江/.test(t))return{dir:"wx",dkey:t};
  if(/^山西/.test(t)){let b=t.replace(/^山西省?/,"").replace(/(平阳府|太原府|潞安府|沁州)/g,"");
    if(/洪洞/.test(b)&&!/[、和及]|等/.test(b))return{dir:"hd",dkey:"洪洞",detail:b.replace(/^.*?洪洞县?/,"")};
    if(!b)return{dir:"sx",dkey:"未写哪个县"};
    if(/[、和及]|等/.test(b))return{dir:"sx",dkey:b.replace(/(二县|两县|等县|等地|县)/g,"")};
    const m=b.match(/^(.+?)县(.*)$/);return m?{dir:"sx",dkey:m[1],detail:m[2]}:{dir:"sx",dkey:b};}
  const k=t.replace(/^本县/,"").replace(/（.*?）/g,"");const v=vByName(k);return{dir:"bx",dkey:v?v.osm_name:k};}
let SEEDS=null;
function seeds(){if(SEEDS)return SEEDS;SEEDS=[];
  for(const p of VIL.pilot){const hedged=/据传|相传|传说/.test(p.history||"");
    for(const s of p.settlers||[]){if(!s.origin||!s.surname)continue;const o=parseOrigin(s.origin);
      SEEDS.push(Object.assign({id:"b:"+p.book+":"+s.surname,village:p.osm_name,surname:s.surname,when:s.when||"",type:hedged?"zhic":"zhi",family:"book:"+p.book,fam:"《赵县地名资料汇编》",page:p.page,quote:p.history,book:true,at:0,detail:""},o));}}
  return SEEDS;}
const all=()=>seeds().concat(Store.all());
const ckey=e=>e.dir+"|"+(e.dir==="bd"?"":e.dkey);
function title(e){
  return {hd:"从山西洪洞迁来",sx:`从山西${esc(e.dkey)}迁来`,bx:`从${esc(e.dkey)}分出来`,wx:`从${esc(e.dkey)}迁来`,bd:"本地原有，不是迁来的"}[e.dir];}
// 一条依据的等级：族谱/碑刻要有照片才算原件，没照片按口传算
function lvOf(e){if((e.type==="zupu"||e.type==="bei"))return e.photo?4:2;return{zhi:3,zhic:2,oral:2,heard:1}[e.type]||1;}
function grade(evs){const fam={};for(const e of evs){const l=lvOf(e);if(!fam[e.family]||fam[e.family].l<l)fam[e.family]={l,e};}
  const fs=Object.values(fam);const lv=Math.max(...fs.map(f=>f.l));
  const c={orig:0,bei:0,zhi:0,zhic:0,oral:0,heard:0};
  for(const f of fs){const t=f.e.type;if(f.l===4)c[t==="bei"?"bei":"orig"]++;else if(t==="zhi")c.zhi++;else if(t==="zhic")c.zhic++;else if(f.l===2)c.oral++;else c.heard++;}
  const parts=[];if(c.orig)parts.push(`族谱照片 ${c.orig} 份`);if(c.bei)parts.push(`碑刻照片 ${c.bei} 份`);if(c.zhi)parts.push(`书里记载 ${c.zhi} 处`);if(c.zhic)parts.push(`书里记的「据传」${c.zhic} 处`);if(c.oral)parts.push(`口传 ${c.oral} 家`);if(c.heard)parts.push(`听说 ${c.heard} 家`);
  let lab=LV[lv];if(lv===2&&c.oral+c.zhic>=3)lab=["多家都这么传","lv2"];
  return{lv,lab,n:fs.length,sum:parts.join(" · ")};}

function evHtml(e){const t=e.book?(e.type==="zhic"?"书里记的「据传」":"书里的记载"):(TYPES.find(x=>x[0]===e.type)||[0,""])[1]+((e.type==="zupu"||e.type==="bei")&&!e.photo?"（没传照片）":"");
  let h=`<div class="ev"><div><span class="evt">${t}</span> <b>${esc(e.fam||"")}</b>`;
  if(e.book)h+=` · 第 ${e.page} 页</div><div class="evq">${esc(e.quote)}</div>`;
  else{const bits=[];if(e.who)bits.push(esc(e.who)+(e.born?`（${esc(e.born)} 年生）`:"")+"说的");if(e.src)bits.push(esc(e.src)+(e.pg?` 第 ${esc(e.pg)} 页`:""));if(e.dir==="hd"&&e.detail)bits.push("洪洞"+esc(e.detail));if(e.when&&e.when!=="不知道")bits.push(esc(e.when));if(e.anc)bits.push("始迁祖 "+esc(e.anc));
    h+=bits.length?" · "+bits.join(" · "):"";h+=`</div>`;if(e.photo)h+=`<img class="evp" src="${e.photo}" alt="照片"><div class="sub">原文转录：上线后由 AI 识别，现在先看照片</div>`;
    h+=`<div class="sub">${new Date(e.at).toLocaleDateString("zh-CN")} 补充${e.demo?' · <span class="demo">演示</span>':""}${e.by===myId&&!e.demo?` · <a class="lnk" data-del="${e.id}">删除</a>`:""}</div>`;}
  return h+`</div>`;}

let CTX=null,EL=null;
function render(el,ctx){EL=el;CTX=ctx;draw();}
function draw(){const{village,surname}=CTX;const A=all();
  const mine=A.filter(e=>e.village===village&&e.surname.includes(surname));
  const groups={};for(const e of mine)(groups[ckey(e)]=groups[ckey(e)]||[]).push(e);
  const cl=Object.entries(groups).map(([k,evs])=>({k,evs,g:grade(evs)})).sort((a,b)=>b.g.lv-a.g.lv||b.g.n-a.g.n);
  let h=`<h3>各家的说法</h3><p class="sub">同村同姓的人各自补充。按依据分级，不按人数投票；同一家的人补充多少条，都只算一家。<a class="lnk" data-act="how">怎么分级</a></p>
  <div class="how hidden card"><div class="kv"><b>有原件</b><span>族谱或碑刻，传了照片</span></div><div class="kv"><b>书里有记载</b><span>县志、地名志明文写的，有书名页码</span></div><div class="kv"><b>口传</b><span>老人说的，写清谁说的；书里写「据传」的也算这一级。三家以上（各算各的）就是「多家都这么传」</span></div><div class="kv"><b>只是听说</b><span>说不清是谁说的</span></div><p class="sub">说法不一样的并排放着，不判谁对谁错。</p></div>`;
  if(!cl.length)h+=`<div class="card empty">还没有${esc(village)}${esc(surname)}家的说法。你家怎么传的？</div>`;
  for(const c of cl){const e0=c.evs[0];
    const whens={},ancs={},dets={};for(const e of c.evs){if(e.when&&e.when!=="不知道")whens[e.when]=(whens[e.when]||new Set()).add(e.family);if(e.anc)ancs[e.anc]=(ancs[e.anc]||new Set()).add(e.family);if(e.detail)dets[e.detail]=(dets[e.detail]||new Set()).add(e.family);}
    const meta=[];const dl=Object.entries(dets);if(dl.length)meta.push("洪洞哪个村："+dl.map(([w,s])=>`${esc(w)}${s.size>1?`（${s.size} 家）`:""}`).join("、"));const wl=Object.entries(whens);if(wl.length)meta.push("年代："+wl.map(([w,s])=>`${esc(w)}${s.size>1?`（${s.size} 家）`:""}`).join("、"));
    const al=Object.entries(ancs);if(al.length)meta.push("始迁祖："+al.map(([a,s])=>`${esc(a)}${s.size>1?`（${s.size} 家）`:""}`).join("、"));
    // 别的村同姓、同一个说法 → 可能是本家
    const others={};for(const e of A)if(e.village!==village&&e.surname.includes(surname)&&ckey(e)===c.k)(others[e.village]=others[e.village]||[]).push(e);
    const ol=Object.entries(others).map(([v,evs])=>{const sameAnc=evs.some(e=>e.anc&&ancs[e.anc]);const nb=evs.filter(e=>e.book).length,nf=new Set(evs.filter(e=>!e.book).map(e=>e.family)).size;
      return{v,sameAnc,txt:`${esc(v)}（${[nb?"书里":"",nf?nf+" 家补充":""].filter(Boolean).join("、")}${sameAnc?"，<b>始迁祖同名</b>":""}）`};}).sort((a,b)=>b.sameAnc-a.sameAnc);
    h+=`<div class="cl ${c.g.lab[1]}"><div class="cl-h"><b>${title(e0)}</b><span class="lvtag ${c.g.lab[1]}">${c.g.lab[0]}</span></div>
      <div class="cl-s">${c.g.sum}</div>${meta.length?`<div class="cl-m">${meta.join("　")}</div>`:""}
      ${ol.length?`<div class="cl-o">${ol.some(o=>o.sameAnc)?"可能是本家：":"赵县别的村也这么说："}${ol.map(o=>o.txt).join("、")}</div>`:""}
      <details><summary>看每一条（${c.evs.length}）</summary>${c.evs.map(evHtml).join("")}</details>
      <div class="cl-b"><button data-act="agree" data-k="${esc(c.k)}">我家也这么传</button><button data-act="proof" data-k="${esc(c.k)}">我有族谱/碑的照片</button></div></div>`;}
  h+=`<button class="btn add" data-act="new">${cl.length?"我家的说法不一样":"补充我家的说法"}</button>
  <p class="sub">试作版：你补充的内容只存在这台手机或电脑的浏览器里，别人暂时看不到。<a class="lnk" data-act="demo">加载演示数据</a> · <a class="lnk" data-act="clear">清除演示数据</a></p>`;
  EL.innerHTML=h;
  EL.querySelectorAll("[data-act]").forEach(b=>b.onclick=ev=>{ev.preventDefault();const a=b.dataset.act;
    if(a==="how")EL.querySelector(".how").classList.toggle("hidden");
    else if(a==="new")form(null,"oral");
    else if(a==="agree"||a==="proof")form(groups[b.dataset.k][0],a==="proof"?"zupu":"oral");
    else if(a==="demo"){loadDemo();draw();}
    else if(a==="clear"){Store.remove(e=>e.demo);draw();}});
  EL.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("删除这条？")){Store.remove(e=>e.id===b.dataset.del);draw();}});
  EL.querySelectorAll(".evp").forEach(img=>img.onclick=()=>lightbox(img.src));}

function lightbox(src){const d=document.createElement("div");d.className="lb";d.innerHTML=`<img src="${src}">`;d.onclick=()=>d.remove();document.body.appendChild(d);}

function families(){const{village,surname}=CTX;const m={};for(const e of Store.all())if(e.village===village&&e.surname.includes(surname))m[e.family]=e.fam;return Object.entries(m);}
function chips(name,list,sel){return `<div class="seg" data-n="${name}">`+list.map(([v,l])=>`<label class="chip2${v===sel?" on":""}"><input type="radio" name="${name}" value="${v}"${v===sel?" checked":""}>${l}</label>`).join("")+`</div>`;}
function form(fixed,type0){const{village,surname}=CTX;const fams=families();
  const m=document.createElement("div");m.className="cm";
  m.innerHTML=`<div class="mbox"><div class="pop-h">补充 ${esc(village)} · ${esc(surname)}家 <a class="x">✕</a></div>
  ${fixed?`<div class="card">说法：<b>${title(fixed)}</b></div>${fixed.dir==="hd"?`<input id="fD1" maxlength="12" placeholder="洪洞哪个村（知道就填，如：老鸹窝）">`:""}`:`<div class="fl">从哪来</div>${chips("dir",DIRS,"hd")}<div id="fDet"></div>`}
  <div class="fl">什么时候</div><select id="fWhen">${WHEN.map(w=>`<option${w==="不知道"?" selected":""}>${w}</option>`).join("")}</select>
  <div class="fl">始迁祖 <span class="sub">选填，族谱上第一代的名字</span></div><input id="fAnc" maxlength="12" placeholder="如：郝成">
  <div class="fl">依据</div>${chips("type",TYPES,type0)}<div id="fEv"></div>
  <div class="fl">你家</div><div id="fFam">${fams.map(([id,l],i)=>`<label class="opt"><input type="radio" name="fam" value="${esc(id)}"> 跟「${esc(l)}」是一家</label>`).join("")}<label class="opt"><input type="radio" name="fam" value="new" checked> ${fams.length?"都不是，":""}新的一家</label><input id="fFamL" maxlength="16" placeholder="怎么称呼你家，如：郝家东院、三门（选填）"></div>
  <p class="sub">一家人（同一个爷爷）补充多少条，都只算一家。</p>
  <div class="err"></div><button class="btn" id="fGo">提交</button></div>`;
  document.body.appendChild(m);const q=s=>m.querySelector(s);
  const close=()=>m.remove();q(".x").onclick=close;m.onclick=e=>{if(e.target===m)close();};
  const val=n=>{const r=m.querySelector(`input[name="${n}"]:checked`);return r?r.value:null;};
  const zxVils=VIL.pilot.map(p=>p.osm_name).concat(VIL.others.map(o=>o.n)).filter(n=>n!==village).sort((a,b)=>a.localeCompare(b,"zh"));
  function det(){if(fixed)return;const d=val("dir"),el=q("#fDet");
    el.innerHTML=d==="hd"?`<input id="fD1" maxlength="12" placeholder="洪洞哪个村（知道就填，如：老鸹窝）">`
      :d==="sx"?`<select id="fD1">${SX_LIST.map(x=>`<option>${x}</option>`).join("")}</select><input id="fD2" class="hidden" maxlength="12" placeholder="县名">`
      :d==="bx"?`<input id="fD1" list="fVl" maxlength="16" placeholder="哪个村，如：小郝庄村；邻县的写上县名"><datalist id="fVl">${zxVils.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`
      :d==="wx"?`<select id="fD1">${WX_LIST.map(x=>`<option>${x}</option>`).join("")}</select><input id="fD2" maxlength="16" placeholder="哪个县（知道就填）">`:"";
    const s=q("#fD1");if(d==="sx")s.onchange=()=>q("#fD2").classList.toggle("hidden",s.value!=="其他县");}
  function evf(){const t=val("type"),el=q("#fEv");
    el.innerHTML=t==="zupu"||t==="bei"?`<label class="up"><input type="file" id="fPh" accept="image/*"><span>拍照或选照片</span></label><img id="fPv" class="evp hidden"><p class="sub">拍写着始迁祖、从哪迁来的那一页。没有照片也能提交，但只按口传算。</p>`
      :t==="zhi"?`<input id="fSrc" maxlength="30" placeholder="书名，如：光绪《赵州志》"><input id="fPg" maxlength="8" placeholder="第几页（选填）">`
      :t==="oral"?`<input id="fWho" maxlength="16" placeholder="谁说的，如：我爷爷"><input id="fBorn" maxlength="4" inputmode="numeric" placeholder="他/她哪年生的（选填）">`
      :`<input id="fWho" maxlength="16" placeholder="听谁说的（选填）">`;
    const f=q("#fPh");if(f)f.onchange=async()=>{if(!f.files[0])return;try{q("#fPv").src=await shrink(f.files[0]);q("#fPv").classList.remove("hidden");}catch(e){q(".err").textContent=e.message;}};}
  m.querySelectorAll(".seg").forEach(s=>s.onchange=()=>{s.querySelectorAll(".chip2").forEach(c=>c.classList.toggle("on",c.querySelector("input").checked));s.dataset.n==="dir"?det():evf();});
  det();evf();
  q("#fGo").onclick=()=>{const err=q(".err");err.textContent="";const t=val("type");
    let o=fixed?{dir:fixed.dir,dkey:fixed.dkey,detail:""}:{dir:val("dir")};
    if(!fixed){const d1=q("#fD1"),d2=q("#fD2");
      if(o.dir==="hd"){o.dkey="洪洞";o.detail=d1.value.trim();}
      else if(o.dir==="sx"){o.dkey=d1.value==="其他县"?d2.value.trim().replace(/县$/,""):d1.value.replace(/（.*）/,"");if(!o.dkey)return err.textContent="填一下是山西哪个县";}
      else if(o.dir==="bx"){const v=d1.value.trim();if(!v)return err.textContent="填一下是从哪个村分出来的";const pv=vByName(v);o.dkey=pv?pv.osm_name:v;}
      else if(o.dir==="wx"){o.dkey=(d1.value.replace(/（.*）/,"").replace(/^其他省$/,"")+(d2.value.trim()?" "+d2.value.trim():"")).trim()||"外省";}
      else o.dkey="";}
    if(fixed&&fixed.dir==="hd")o.detail=q("#fD1").value.trim();
    const e=Object.assign(o,{id:"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),village,surname,when:q("#fWhen").value,anc:q("#fAnc").value.trim(),type:t,by:myId,at:Date.now()});
    if(t==="oral"){e.who=q("#fWho").value.trim();if(!e.who)return err.textContent="写一下是谁说的，比如「我爷爷」";e.born=q("#fBorn").value.trim();}
    if(t==="heard")e.who=q("#fWho").value.trim();
    if(t==="zhi"){e.src=q("#fSrc").value.trim();e.pg=q("#fPg").value.trim();if(!e.src)return err.textContent="写一下是哪本书";}
    if(t==="zupu"||t==="bei"){const pv=q("#fPv");if(pv&&!pv.classList.contains("hidden"))e.photo=pv.src;}
    const fv=val("fam");if(fv==="new"){e.family="f"+Date.now().toString(36);e.fam=q("#fFamL").value.trim()||`${surname}家（${new Date().toLocaleDateString("zh-CN")} 补充）`;}else{e.family=fv;e.fam=(fams.find(f=>f[0]===fv)||[0,""])[1];}
    try{Store.add(e);}catch(x){return err.textContent=x.message;}
    close();draw();};}

function shrink(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1100/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);res(c.toDataURL("image/jpeg",.72));};img.onerror=()=>rej(new Error("这张图读不出来，换一张试试"));img.src=URL.createObjectURL(file);});}

// 演示数据：全部标「演示」，可一键清除
function loadDemo(){Store.remove(e=>e.demo);const t0=Date.now()-86400000*3;let i=0;
  const D=(o)=>Store.add(Object.assign({id:"demo"+(i++),surname:"郝",when:"不知道",by:"demo",demo:true,at:t0+i*3600000},o));
  D({village:"泥沟村",dir:"hd",dkey:"洪洞",detail:"老鸹窝",when:"明永乐年间",anc:"郝成",type:"oral",who:"我爷爷",born:"1931",family:"dA",fam:"郝家东院"});
  D({village:"泥沟村",dir:"hd",dkey:"洪洞",detail:"",when:"明永乐年间",type:"oral",who:"我奶奶",born:"1934",family:"dA",fam:"郝家东院"});
  D({village:"泥沟村",dir:"hd",dkey:"洪洞",detail:"",when:"明初（不清楚哪年）",type:"oral",who:"我大伯",born:"1952",family:"dB",fam:"郝家后街"});
  D({village:"泥沟村",dir:"hd",dkey:"洪洞",detail:"",type:"heard",who:"",family:"dC",fam:"郝家南头"});
  D({village:"泥沟村",dir:"bx",dkey:"小郝庄村",when:"清代",type:"oral",who:"我父亲",born:"1950",family:"dD",fam:"郝家西头"});
  D({village:"小郝庄村",dir:"hd",dkey:"洪洞",detail:"老鸹窝",when:"明永乐年间",anc:"郝成",type:"oral",who:"我爷爷",born:"1928",family:"dE",fam:"小郝庄郝家"});}

return{render,Store};
})();
