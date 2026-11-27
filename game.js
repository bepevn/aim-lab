(function(){
const $=id=>document.getElementById(id);
const cv=$('c'),g=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();

/* ---------- 설정 ---------- */
const COLORS=['#00e5ff','#ff3d6e','#ffd166','#7dff6b','#c77dff'];
const cfg={mode:'grid',dur:60,sens:1,fov:90,size:1,color:COLORS[0],sound:true,diff:'normal'};
const MODE_NAME={grid:'그리드샷',flick:'플릭샷',track:'트래킹',duel:'교전'};
/* 난이도: n=동시 적 수, react=적 반응속도(초), acc=적 명중률, dmg=적 한 발 피해, spd=적 이동속도, ehp=적 체력, ts=타겟 크기 배율 */
const DIFF={
  easy:  {name:'쉬움',  n:1,react:.9, acc:.22,dmg:12,spd:2.6,ehp:100,ts:1.25},
  normal:{name:'보통',  n:2,react:.55,acc:.36,dmg:17,spd:3.2,ehp:100,ts:1},
  hard:  {name:'어려움',n:3,react:.36,acc:.5, dmg:22,spd:3.8,ehp:150,ts:.8},
  hell:  {name:'지옥',  n:4,react:.22,acc:.65,dmg:28,spd:4.4,ehp:150,ts:.65}
};
let D=DIFF.normal;
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function bestKey(m){return 'aimforge_'+(m||cfg.mode)+'_'+cfg.dur+'_'+cfg.diff;}
function showBests(){Object.keys(MODE_NAME).forEach(m=>{const v=store(bestKey(m));$('b_'+m).textContent=v?'최고 '+Number(v).toLocaleString():'기록 없음';});}

/* ---------- 메뉴 UI ---------- */
function pick(box,el){[...box.children].forEach(c=>c.classList.remove('on'));el.classList.add('on');}
$('modes').onclick=e=>{const c=e.target.closest('.card');if(!c)return;pick($('modes'),c);cfg.mode=c.dataset.m;};
$('durs').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;pick($('durs'),c);cfg.dur=+c.dataset.d;showBests();};
$('diffs').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;pick($('diffs'),c);cfg.diff=c.dataset.f;D=DIFF[cfg.diff];showBests();};
$('snd').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;pick($('snd'),c);cfg.sound=c.dataset.s==='1';};
COLORS.forEach((c,i)=>{const d=document.createElement('span');d.className='dot'+(i?'':' on');d.style.background=c;d.onclick=()=>{pick($('cols'),d);cfg.color=c;};$('cols').appendChild(d);});
[['sens',2],['fov',0],['size',2]].forEach(([k,f])=>{$(k).oninput=()=>{cfg[k]=+$(k).value;$(k+'O').textContent=cfg[k].toFixed(f);};});
showBests();

/* ---------- 사운드 (pan: -1 왼쪽 ~ 1 오른쪽) ---------- */
let AC=null;
function beep(freq,dur,type,vol,pan,endFreq){
  if(!cfg.sound)return;
  try{
    if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),v=AC.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(freq,AC.currentTime);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,AC.currentTime+dur);
    v.gain.setValueAtTime(vol||0.12,AC.currentTime);
    v.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
    o.connect(v);
    if(pan!==undefined&&AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));v.connect(p);p.connect(AC.destination);}
    else v.connect(AC.destination);
    o.start();o.stop(AC.currentTime+dur);
  }catch(e){}
}

/* ---------- 3D 카메라 ---------- */
let yaw=0,pitch=0,focal=500,px=0,pz=0,rec=0;
const NEAR=0.1;
function toCam(x,y,z){
  x-=px;z-=pz;const p=pitch+rec;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(p),sp=Math.sin(p);
  const x1=x*cy-z*sy,z1=x*sy+z*cy;
  return [x1,y*cp-z1*sp,y*sp+z1*cp];
}
function line3(a,b){
  let p=toCam(a[0],a[1],a[2]),q=toCam(b[0],b[1],b[2]);
  if(p[2]<NEAR&&q[2]<NEAR)return;
  if(p[2]<NEAR){const t=(NEAR-p[2])/(q[2]-p[2]);p=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,NEAR];}
  else if(q[2]<NEAR){const t=(NEAR-q[2])/(p[2]-q[2]);q=[q[0]+(p[0]-q[0])*t,q[1]+(p[1]-q[1])*t,NEAR];}
  g.moveTo(W/2+p[0]*focal/p[2],H/2-p[1]*focal/p[2]);
  g.lineTo(W/2+q[0]*focal/q[2],H/2-q[1]*focal/q[2]);
}
function poly3(pts,fill,stroke){
  const c=pts.map(p=>toCam(p[0],p[1],p[2])),out=[];
  for(let i=0;i<c.length;i++){
    const a=c[i],b=c[(i+1)%c.length],ain=a[2]>=NEAR,bin=b[2]>=NEAR;
    if(ain)out.push(a);
    if(ain!==bin){const t=(NEAR-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,NEAR]);}
  }
  if(out.length<3)return;
  g.beginPath();
  out.forEach((p,i)=>{const sx=W/2+p[0]*focal/p[2],sy=H/2-p[1]*focal/p[2];if(i)g.lineTo(sx,sy);else g.moveTo(sx,sy);});
  g.closePath();
  if(fill){g.fillStyle=fill;g.fill();}
  if(stroke){g.strokeStyle=stroke;g.stroke();}
}

/* ---------- 연습장(타겟 모드) ---------- */
const R={x0:-11,x1:11,y0:-3,y1:7,z0:-8,z1:14};
function drawRoom(){
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#070b18');bg.addColorStop(1,'#0b1226');
  g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.lineWidth=1;
  g.strokeStyle='rgba(0,229,255,.22)';g.beginPath();
  for(let x=R.x0;x<=R.x1;x+=2){line3([x,R.y0,R.z0],[x,R.y0,R.z1]);line3([x,R.y1,R.z0],[x,R.y1,R.z1]);}
  for(let z=R.z0;z<=R.z1;z+=2){line3([R.x0,R.y0,z],[R.x1,R.y0,z]);line3([R.x0,R.y1,z],[R.x1,R.y1,z]);}
  g.stroke();
  g.strokeStyle='rgba(255,61,240,.16)';g.beginPath();
  for(let y=R.y0;y<=R.y1;y+=2){
    line3([R.x0,y,R.z1],[R.x1,y,R.z1]);line3([R.x0,y,R.z0],[R.x0,y,R.z1]);
    line3([R.x1,y,R.z0],[R.x1,y,R.z1]);line3([R.x0,y,R.z0],[R.x1,y,R.z0]);
  }
  for(let x=R.x0;x<=R.x1;x+=2){line3([x,R.y0,R.z1],[x,R.y1,R.z1]);line3([x,R.y0,R.z0],[x,R.y1,R.z0]);}
  for(let z=R.z0;z<=R.z1;z+=2){line3([R.x0,R.y0,z],[R.x0,R.y1,z]);line3([R.x1,R.y0,z],[R.x1,R.y1,z]);}
  g.stroke();
  g.strokeStyle='rgba(0,229,255,.6)';g.lineWidth=2;g.beginPath();
  line3([R.x0,R.y0,R.z1],[R.x1,R.y0,R.z1]);line3([R.x0,R.y1,R.z1],[R.x1,R.y1,R.z1]);
  line3([R.x0,R.y0,R.z1],[R.x0,R.y1,R.z1]);line3([R.x1,R.y0,R.z1],[R.x1,R.y1,R.z1]);
  g.stroke();
}

/* ---------- 게임 상태 ---------- */
let state='menu',targets=[],parts=[],floats=[];
let timeLeft=0,score=0,shots=0,hits=0,combo=0,maxCombo=0,ttkSum=0,onTime=0,playTime=0,flash=0,onTarget=false;
let locked=false,noLock=false,countEnd=0,lastT=0,duel=false;
const rnd=(a,b)=>a+Math.random()*(b-a);

/* ================= 교전 모드 ================= */
const FLOOR=-1.6,A=20,WALL_H=5,MAG=25;
const DMG={head:160,body:40,legs:34};
let boxes=[],enemies=[],tracers=[],inds=[];
let hp=100,shield=50,ammo=MAG,reloadT=0,fireCd=0,firing=false,spray=0,sprayT=0,moving=false;
let kills=0,headHits=0,dmgTaken=0,hurtT=0,spawnCd=0,dead=false;
const keys={};

function inBox(x,z,r){
  if(Math.abs(x)>A-r||Math.abs(z)>A-r)return true;
  for(const b of boxes)if(x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r)return true;
  return false;
}
function makeBoxes(){
  boxes=[];
  const hs=[1.2,1.2,2.4,2.4,3];
  for(let i=0;i<400&&boxes.length<18;i++){
    let w=rnd(1.6,4.2),d=rnd(1,2.2);if(Math.random()<.5){const s=w;w=d;d=s;}
    const cx=rnd(-16,16),cz=rnd(-16,16);
    const b={x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2,h:hs[Math.random()*hs.length|0]};
    if(b.x0<3.2&&b.x1>-3.2&&b.z0<3.2&&b.z1>-3.2)continue; // 시작 지점 비우기
    if(boxes.some(o=>b.x0<o.x1+1.8&&b.x1>o.x0-1.8&&b.z0<o.z1+1.8&&b.z1>o.z0-1.8))continue;
    boxes.push(b);
  }
}
/* 광선-박스 교차: 진입 거리 t (없으면 Infinity) */
function rayBox(o,d,b){
  let t0=0,t1=Infinity;
  const mn=[b.x0,FLOOR,b.z0],mx=[b.x1,FLOOR+b.h,b.z1];
  for(let i=0;i<3;i++){
    if(Math.abs(d[i])<1e-9){if(o[i]<mn[i]||o[i]>mx[i])return Infinity;}
    else{
      let a=(mn[i]-o[i])/d[i],c=(mx[i]-o[i])/d[i];if(a>c){const s=a;a=c;c=s;}
      if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)return Infinity;
    }
  }
  return t0;
}
/* 광선-적 히트박스: 머리(구) / 몸통 / 다리(원기둥) */
function rayEnemy(o,d,e){
  let best=null;
  const ox=o[0]-e.x,oy=o[1]-(FLOOR+1.62),oz=o[2]-e.z,r=.2;
  const b=ox*d[0]+oy*d[1]+oz*d[2],c=ox*ox+oy*oy+oz*oz-r*r,disc=b*b-c;
  if(disc>=0){const t=-b-Math.sqrt(disc);if(t>0)best={t,part:'head'};}
  const a=d[0]*d[0]+d[2]*d[2];
  if(a>1e-9){
    const fx=o[0]-e.x,fz=o[2]-e.z,bb=fx*d[0]+fz*d[2];
    const cyl=(rad,ya,yb,part)=>{
      const ds=bb*bb-a*(fx*fx+fz*fz-rad*rad);if(ds<0)return;
      const t=(-bb-Math.sqrt(ds))/a;if(t<=0)return;
      const y=o[1]+d[1]*t;if(y<ya||y>yb)return;
      if(!best||t<best.t)best={t,part};
    };
    cyl(.28,FLOOR+.85,FLOOR+1.48,'body');cyl(.22,FLOOR,FLOOR+.85,'legs');
  }
  return best;
}
function hasLOS(e){
  const o=[e.x,FLOOR+1.62,e.z],d=[px-e.x,-(FLOOR+1.62),pz-e.z];
  for(const b of boxes)if(rayBox(o,d,b)<1)return false;
  return true;
}
function pickTarget(e){
  for(let i=0;i<30;i++){
    let x,z;
    if(i<24&&boxes.length){
      const b=boxes[Math.random()*boxes.length|0],s=Math.random()*4|0;
      x=s===0?b.x0-.8:s===1?b.x1+.8:rnd(b.x0,b.x1);
      z=s===2?b.z0-.8:s===3?b.z1+.8:rnd(b.z0,b.z1);
    }else{x=rnd(-17,17);z=rnd(-17,17);}
    if(inBox(x,z,.4)||Math.hypot(x-px,z-pz)<4)continue;
    e.tx=x;e.tz=z;return;
  }
  e.tx=e.x;e.tz=e.z;e.wait=.5;
}
function spawnEnemy(){
  let x=0,z=0;
  for(let i=0;i<60;i++){
    x=rnd(-18,18);z=rnd(-18,18);
    if(inBox(x,z,.5)||Math.hypot(x-px,z-pz)<11)continue;
    if(i<45&&hasLOS({x,z}))continue; // 되도록 안 보이는 곳에서 등장
    break;
  }
  const e={x,z,hp:D.ehp,tx:x,tz:z,wait:0,step:0,aware:0,burst:3,fireCd:0,pause:0,flash:0,hitFlash:0,stuck:0};
  pickTarget(e);enemies.push(e);
}
function footstep(e){
  const dx=e.x-px,dz=e.z-pz,dist=Math.hypot(dx,dz);if(dist>26)return;
  const rel=Math.atan2(dx,dz)-yaw,back=Math.cos(rel)<0;
  const vol=.6*Math.pow(1-dist/26,1.3)*(back?.7:1);
  beep(back?130:190,.1,'triangle',Math.max(.01,vol),Math.sin(rel),back?45:60); // 뒤쪽은 더 낮고 먹먹하게
}
function hurt(d,e){
  dmgTaken+=d;const s=Math.min(shield,d);shield-=s;hp-=d-s;hurtT=.35;
  inds.push({x:e.x,z:e.z,life:1.3});beep(90,.12,'sawtooth',.12);
  if(hp<=0){hp=0;endGame(true);}
}
function enemyFire(e){
  const dx=e.x-px,dz=e.z-pz,dist=Math.hypot(dx,dz);
  e.flash=.06;
  beep(240,.07,'square',Math.max(.02,.16*(1-dist/40)),Math.sin(Math.atan2(dx,dz)-yaw),90);
  const p=D.acc*Math.max(.25,Math.min(1,1.2-dist/35))*(moving?.8:1);
  const hit=Math.random()<p,o=hit?.12:.9;
  tracers.push({a:[e.x,FLOOR+1.3,e.z],b:[px+rnd(-o,o),-.3+rnd(-o,o)*.5,pz+rnd(-o,o)],life:.1});
  if(hit)hurt(D.dmg,e);
}
function updEnemy(e,dt){
  const los=hasLOS(e);
  e.aware=los?e.aware+dt:Math.max(0,e.aware-dt*3);
  if(e.flash>0)e.flash-=dt;if(e.hitFlash>0)e.hitFlash-=dt;
  if(los&&e.aware>=D.react){
    if(e.pause>0)e.pause-=dt;
    else{ // 멈춰서 점사
      e.fireCd-=dt;
      if(e.fireCd<=0){enemyFire(e);e.fireCd=.14;if(--e.burst<=0){e.burst=3+(Math.random()*3|0);e.pause=rnd(.45,1);}}
      return;
    }
  }
  if(e.wait>0){e.wait-=dt;if(e.wait<=0)pickTarget(e);return;}
  const dx=e.tx-e.x,dz=e.tz-e.z,dl=Math.hypot(dx,dz);
  if(dl<.3){e.wait=rnd(.6,2.2);return;}
  const st=D.spd*dt,nx=e.x+dx/dl*st,nz=e.z+dz/dl*st;let mv=0;
  if(!inBox(nx,e.z,.35)){mv+=Math.abs(nx-e.x);e.x=nx;}
  if(!inBox(e.x,nz,.35)){mv+=Math.abs(nz-e.z);e.z=nz;}
  if(mv<st*.3){e.stuck+=dt;if(e.stuck>.4){e.stuck=0;pickTarget(e);}}else e.stuck=0;
  e.step-=dt;if(e.step<=0){e.step=.34;footstep(e);}
}
function fireGun(){
  shots++;ammo--;flash=.06;fireCd=.1;
  const sp=Math.min(.035,spray*.0045)+(moving?.02:0);spray++;sprayT=.3;
  const an=rnd(0,6.2832),m=Math.sqrt(Math.random())*sp;
  const yy=yaw+Math.cos(an)*m,pp=pitch+rec+Math.sin(an)*m;
  const d=[Math.sin(yy)*Math.cos(pp),Math.sin(pp),Math.cos(yy)*Math.cos(pp)],o=[px,0,pz];
  let bt=Infinity;for(const b of boxes)bt=Math.min(bt,rayBox(o,d,b));
  let hit=null,he=null;
  for(const e of enemies){const h=rayEnemy(o,d,e);if(h&&h.t<bt&&(!hit||h.t<hit.t)){hit=h;he=e;}}
  rec=Math.min(.07,rec+.007);
  beep(320,.06,'square',.07,0,120);
  if(hit){
    hits++;const dm=DMG[hit.part],head=hit.part==='head';if(head)headHits++;
    he.hp-=dm;he.hitFlash=.1;he.aware=Math.max(he.aware,D.react*.6);
    const hx=o[0]+d[0]*hit.t,hy=o[1]+d[1]*hit.t,hz=o[2]+d[2]*hit.t;
    floats.push({x:hx,y:hy+.25,z:hz,txt:''+dm,life:.6,col:head?'#ffd166':'#fff'});
    beep(head?1500:620,head?.12:.06,'triangle',.14);
    if(he.hp<=0){
      kills++;score+=200+(head?100:0);
      burst({x:he.x,y:FLOOR+1.1,z:he.z},'#ff3d6e');burst({x:he.x,y:FLOOR+1.5,z:he.z},'#ffffff');
      enemies.splice(enemies.indexOf(he),1);spawnCd=1.2;
      setTimeout(()=>beep(880,.15,'sine',.12),60);
    }
  }else if(bt<60){
    for(let i=0;i<4;i++)parts.push({x:o[0]+d[0]*bt,y:o[1]+d[1]*bt,z:o[2]+d[2]*bt,vx:rnd(-2,2),vy:rnd(0,3),vz:rnd(-2,2),life:.25,col:'#9fdcff'});
  }
  if(ammo<=0)startReload();
}
function startReload(){if(reloadT>0||ammo>=MAG)return;reloadT=1.8;beep(500,.05,'square',.05);}
function updateDuel(dt){
  // 이동 (WASD)
  let f=(keys.w?1:0)-(keys.s?1:0),s=(keys.d?1:0)-(keys.a?1:0);
  if(noLock){if(keys.arrowleft)yaw-=2.2*dt;if(keys.arrowright)yaw+=2.2*dt;}
  moving=!!(f||s);
  if(moving){
    const l=Math.hypot(f,s),sp=(keys.shift?2.6:5)*dt/l;
    const vx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp,vz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp;
    if(!inBox(px+vx,pz,.4))px+=vx;
    if(!inBox(px,pz+vz,.4))pz+=vz;
  }
  // 사격
  fireCd-=dt;rec*=Math.exp(-7*dt);
  if(sprayT>0){sprayT-=dt;if(sprayT<=0)spray=0;}
  if(reloadT>0){reloadT-=dt;if(reloadT<=0){ammo=MAG;beep(700,.06,'square',.06);}}
  else if(firing&&fireCd<=0&&ammo>0)fireGun();
  // 적
  if(enemies.length<D.n){spawnCd-=dt;if(spawnCd<=0){spawnEnemy();spawnCd=1.2;}}
  for(const e of enemies.slice()){updEnemy(e,dt);if(state!=='play')return;}
  if(hurtT>0)hurtT-=dt;
}
function drawBox(b){
  const y0=FLOOR,y1=FLOOR+b.h,st='rgba(0,229,255,.55)';
  g.lineWidth=1.5;
  if(px<b.x0)poly3([[b.x0,y0,b.z0],[b.x0,y0,b.z1],[b.x0,y1,b.z1],[b.x0,y1,b.z0]],'#13223e',st);
  if(px>b.x1)poly3([[b.x1,y0,b.z0],[b.x1,y0,b.z1],[b.x1,y1,b.z1],[b.x1,y1,b.z0]],'#13223e',st);
  if(pz<b.z0)poly3([[b.x0,y0,b.z0],[b.x1,y0,b.z0],[b.x1,y1,b.z0],[b.x0,y1,b.z0]],'#1b2e52',st);
  if(pz>b.z1)poly3([[b.x0,y0,b.z1],[b.x1,y0,b.z1],[b.x1,y1,b.z1],[b.x0,y1,b.z1]],'#1b2e52',st);
  if(y1<0)poly3([[b.x0,y1,b.z0],[b.x1,y1,b.z0],[b.x1,y1,b.z1],[b.x0,y1,b.z1]],'#26406e',st);
}
function drawEnemy(e){
  const ft=toCam(e.x,FLOOR,e.z),hi=toCam(e.x,FLOOR+.85,e.z),sh=toCam(e.x,FLOOR+1.42,e.z),hd=toCam(e.x,FLOOR+1.62,e.z);
  if(ft[2]<.3||hi[2]<.3||sh[2]<.3||hd[2]<.3)return;
  const P=c=>[W/2+c[0]*focal/c[2],H/2-c[1]*focal/c[2]];
  const a=P(ft),b=P(hi),c=P(sh),d=P(hd),s=focal/hi[2];
  const col=e.hitFlash>0?'#ffffff':'#ff3d6e';
  g.save();g.lineCap='round';g.shadowColor='#ff3d6e';g.shadowBlur=14;
  g.strokeStyle='#a81f45';g.lineWidth=.17*s;g.beginPath();
  g.moveTo(b[0]-.09*s,b[1]);g.lineTo(a[0]-.12*s,a[1]);g.moveTo(b[0]+.09*s,b[1]);g.lineTo(a[0]+.12*s,a[1]);g.stroke();
  g.strokeStyle=col;g.lineWidth=.44*s;g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.stroke();
  g.shadowBlur=0;
  g.strokeStyle='#0a0f1c';g.lineWidth=.09*s;g.beginPath();g.moveTo(c[0]-.2*s,c[1]+.22*s);g.lineTo(c[0]+.3*s,c[1]+.16*s);g.stroke();
  g.fillStyle=e.hitFlash>0?'#fff':'#ffd9a8';g.beginPath();g.arc(d[0],d[1],.17*s,0,6.2832);g.fill();
  g.strokeStyle='#ff3d6e';g.lineWidth=Math.max(1,.03*s);g.stroke();
  if(e.flash>0){g.fillStyle='#fff3a0';g.shadowColor='#ffd166';g.shadowBlur=20;g.beginPath();g.arc(c[0]+.3*s,c[1]+.16*s,.16*s,0,6.2832);g.fill();}
  g.restore();
}
function drawArena(dt){
  const hy=H/2+Math.tan(pitch+rec)*focal;
  const sky=g.createLinearGradient(0,0,0,Math.max(1,hy));sky.addColorStop(0,'#050814');sky.addColorStop(1,'#1a1440');
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  g.fillStyle='#090e1c';g.fillRect(0,hy,W,H-hy);
  g.lineWidth=1;g.strokeStyle='rgba(0,229,255,.16)';g.beginPath();
  for(let v=-A;v<=A;v+=2){line3([v,FLOOR,-A],[v,FLOOR,A]);line3([-A,FLOOR,v],[A,FLOOR,v]);}
  g.stroke();
  const y0=FLOOR,y1=FLOOR+WALL_H,ws='rgba(255,61,240,.5)';
  g.lineWidth=2;
  poly3([[-A,y0,A],[A,y0,A],[A,y1,A],[-A,y1,A]],'#0d1530',ws);
  poly3([[-A,y0,-A],[A,y0,-A],[A,y1,-A],[-A,y1,-A]],'#0d1530',ws);
  poly3([[-A,y0,-A],[-A,y0,A],[-A,y1,A],[-A,y1,-A]],'#0a1128',ws);
  poly3([[A,y0,-A],[A,y0,A],[A,y1,A],[A,y1,-A]],'#0a1128',ws);
  g.lineWidth=1;g.strokeStyle='rgba(255,61,240,.18)';g.beginPath();
  for(let v=-A+4;v<A;v+=4){line3([v,y0,A],[v,y1,A]);line3([v,y0,-A],[v,y1,-A]);line3([-A,y0,v],[-A,y1,v]);line3([A,y0,v],[A,y1,v]);}
  g.stroke();
  // 그리는 순서: 먼 것부터, 적은 자기를 가리는 첫 엄폐물 바로 앞에 끼워 넣기
  const nd=b=>Math.hypot(Math.max(b.x0-px,0,px-b.x1),Math.max(b.z0-pz,0,pz-b.z1));
  const bs=boxes.slice().sort((a,b)=>nd(b)-nd(a));
  const es=enemies.map(e=>{
    let i=bs.findIndex(b=>!((e.x<b.x0&&px<b.x0)||(e.x>b.x1&&px>b.x1)||(e.z<b.z0&&pz<b.z0)||(e.z>b.z1&&pz>b.z1)));
    return {e,i:i<0?bs.length:i,d:Math.hypot(e.x-px,e.z-pz)};
  }).sort((a,b)=>b.d-a.d);
  for(let i=0;i<=bs.length;i++){
    for(const o of es)if(o.i===i)drawEnemy(o.e);
    if(i<bs.length)drawBox(bs[i]);
  }
  // 총알 궤적
  g.lineWidth=2;g.strokeStyle='rgba(255,220,120,.9)';
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i];t.life-=dt;if(t.life<=0){tracers.splice(i,1);continue;}
    g.beginPath();line3(t.a,t.b);g.stroke();
  }
}
function drawDuelHud(dt){
  // 피격 화면 효과
  if(hurtT>0){
    const v=g.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.8);
    v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,'rgba(255,0,40,'+(hurtT*1.6).toFixed(2)+')');
    g.fillStyle=v;g.fillRect(0,0,W,H);
  }
  // 피격 방향 표시
  g.lineCap='round';g.lineWidth=9;
  for(let i=inds.length-1;i>=0;i--){
    const n=inds[i];n.life-=dt;if(n.life<=0){inds.splice(i,1);continue;}
    const ang=Math.atan2(n.x-px,n.z-pz)-yaw-Math.PI/2;
    g.strokeStyle='rgba(255,50,80,'+Math.min(1,n.life).toFixed(2)+')';
    g.beginPath();g.arc(W/2,H/2,110,ang-.3,ang+.3);g.stroke();
  }
  g.lineCap='butt';
  // 총
  const k=flash>0?9:0,bx=W*.64,by=H;
  g.fillStyle='#121a2c';g.strokeStyle='rgba(0,229,255,.6)';g.lineWidth=2;
  g.beginPath();g.moveTo(bx+k,by);g.lineTo(bx+55+k,by-150+k);g.lineTo(bx+92+k,by-160+k);g.lineTo(bx+240+k,by);g.closePath();g.fill();g.stroke();
  if(flash>0){g.fillStyle='rgba(255,230,140,.9)';g.beginPath();g.arc(bx+72,by-168,22,0,6.2832);g.fill();}
  // 체력 / 실드
  const x=28,y=H-34;
  g.fillStyle='rgba(8,14,28,.75)';g.fillRect(x-10,y-46,250,62);
  g.textAlign='left';g.font='800 34px Segoe UI, sans-serif';g.fillStyle=hp>30?'#fff':'#ff4d6d';g.fillText(Math.ceil(hp),x,y);
  g.font='600 12px Segoe UI, sans-serif';g.fillStyle='#6fd8ff';g.fillText('HP',x,y-34);g.fillText('SHIELD '+Math.ceil(shield),x+140,y-34);
  g.fillStyle='#1c2742';g.fillRect(x+78,y-22,150,9);g.fillRect(x+78,y-9,150,6);
  g.fillStyle=hp>30?'#7dff6b':'#ff4d6d';g.fillRect(x+78,y-22,150*hp/100,9);
  g.fillStyle='#00e5ff';g.fillRect(x+78,y-9,150*shield/50,6);
  // 탄약
  g.textAlign='center';
  g.fillStyle='rgba(8,14,28,.75)';g.fillRect(W/2-70,H-70,140,52);
  if(reloadT>0){g.font='700 18px Segoe UI, sans-serif';g.fillStyle='#ffd166';g.fillText('재장전 중...',W/2,H-38);}
  else{g.font='800 30px Segoe UI, sans-serif';g.fillStyle=ammo>5?'#fff':'#ff4d6d';g.fillText(ammo+' / '+MAG,W/2,H-34);}
}

/* ================= 타겟 모드 ================= */
function spawn(){
  const m=cfg.mode,k=cfg.size*D.ts;let t;
  for(let i=0;i<40;i++){
    if(m==='grid')t={x:rnd(-4.2,4.2),y:rnd(-0.8,3.6),z:11,r:0.55*k};
    else if(m==='flick')t={x:rnd(-7.5,7.5),y:rnd(-1.5,5),z:rnd(8,12.5),r:0.3*k};
    else t={x:rnd(-4,4),y:rnd(0,3),z:10,r:0.6*k,vx:rnd(2.5,4.5)*(Math.random()<.5?-1:1),vy:rnd(-1.5,1.5),turn:rnd(.5,1.5)};
    if(!targets.some(o=>Math.hypot(o.x-t.x,o.y-t.y,o.z-t.z)<o.r+t.r+0.5))break;
  }
  t.born=performance.now();t.pop=0;targets.push(t);
}
function reset(){
  targets=[];parts=[];floats=[];enemies=[];tracers=[];inds=[];boxes=[];
  timeLeft=cfg.dur;score=shots=hits=combo=maxCombo=0;ttkSum=onTime=playTime=0;yaw=pitch=px=pz=rec=0;onTarget=false;
  duel=cfg.mode==='duel';
  $('hComboL').textContent=duel?'KILLS':'COMBO';
  if(duel){
    hp=100;shield=50;ammo=MAG;reloadT=fireCd=spray=sprayT=0;firing=false;kills=headHits=dmgTaken=hurtT=0;spawnCd=.5;dead=false;
    makeBoxes();
  }else{const n=cfg.mode==='grid'?3:1;for(let i=0;i<n;i++)spawn();}
}
function show(id,on){$(id).classList.toggle('hide',!on);}
function requestLock(){
  if(noLock)return;
  try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{noLock=true;});}catch(e){noLock=true;}
}
function startGame(){
  reset();show('menu',false);show('result',false);show('pause',false);show('hud',true);show('count',true);
  document.body.style.cursor=noLock?'none':'';
  state='count';countEnd=performance.now()+3000;requestLock();
}
function toMenu(){state='menu';duel=false;px=pz=rec=0;show('pause',false);show('result',false);show('hud',false);show('count',false);show('menu',true);showBests();if(document.pointerLockElement)document.exitPointerLock();document.body.style.cursor='';}
function pauseGame(){if(state!=='play'&&state!=='count')return;state='pause';firing=false;for(const k in keys)keys[k]=false;show('count',false);show('pause',true);document.body.style.cursor='';}
function resumeGame(){show('pause',false);show('count',true);state='count';countEnd=performance.now()+1500;requestLock();if(noLock)document.body.style.cursor='none';}
function endGame(died){
  state='result';dead=!!died;firing=false;if(document.pointerLockElement)document.exitPointerLock();document.body.style.cursor='';
  show('hud',false);show('result',true);
  if(died)beep(200,.5,'sawtooth',.15,0,60);else{beep(660,.25,'triangle',.15);setTimeout(()=>beep(880,.35,'triangle',.15),150);}
  const tr=cfg.mode==='track';
  const acc=tr?(playTime?onTime/playTime*100:0):(shots?hits/shots*100:0);
  const sc=Math.max(0,Math.round(score));
  const prev=+store(bestKey())||0,isBest=sc>prev;if(isBest)store(bestKey(),sc);
  $('rMode').textContent=MODE_NAME[cfg.mode]+' · '+D.name+' · '+cfg.dur+'초';
  $('rScore').textContent=sc.toLocaleString();
  $('rGrade').textContent=[died?'사망':'',isBest&&sc>0?'★ 최고 기록 갱신!':''].filter(Boolean).join(' · ');
  $('rAcc').textContent=acc.toFixed(1)+'%';
  $('rBest').textContent=Math.max(prev,sc).toLocaleString();
  if(duel){
    $('rHitL').textContent='처치';$('rHit').textContent=kills;
    $('rTtkL').textContent='헤드샷 비율';$('rTtk').textContent=hits?(headHits/hits*100).toFixed(0)+'%':'-';
    $('rComboL').textContent='받은 피해';$('rCombo').textContent=dmgTaken;
    $('rKpsL').textContent='결과';$('rKps').textContent=died?'사망':'생존';
    return;
  }
  $('rComboL').textContent='최대 콤보';$('rKpsL').textContent='초당 처치';
  $('rHitL').textContent=tr?'조준 유지 시간':'명중 / 발사';
  $('rHit').textContent=tr?onTime.toFixed(1)+'초':hits+' / '+shots;
  $('rTtkL').textContent=tr?'플레이 시간':'평균 처치 시간';
  $('rTtk').textContent=tr?playTime.toFixed(1)+'초':(hits?Math.round(ttkSum/hits)+'ms':'-');
  $('rCombo').textContent=tr?'-':maxCombo;
  $('rKps').textContent=tr?'-':(hits/cfg.dur).toFixed(2);
}

/* ---------- 입력 ---------- */
$('start').onclick=startGame;$('again').onclick=startGame;$('resume').onclick=resumeGame;
$('toMenu1').onclick=toMenu;$('toMenu2').onclick=toMenu;
document.addEventListener('pointerlockchange',()=>{
  locked=document.pointerLockElement===cv;
  if(!locked&&!noLock)pauseGame();
});
document.addEventListener('pointerlockerror',()=>{noLock=true;if(state==='play'||state==='count')document.body.style.cursor='none';});
document.addEventListener('mousemove',e=>{
  if(state!=='play'&&state!=='count')return;
  if(locked||(noLock&&duel)){
    const k=cfg.sens*0.0013;
    yaw+=e.movementX*k;pitch-=e.movementY*k;
  }else if(noLock){
    yaw=Math.atan((e.clientX-W/2)/focal)*1.6;pitch=Math.atan(-(e.clientY-H/2)/focal)*1.6;
  }
  pitch=Math.max(-1.2,Math.min(1.2,pitch));
  if(!duel)yaw=Math.max(-1.9,Math.min(1.9,yaw)); // 교전 모드는 360도 회전
});
cv.addEventListener('mousedown',e=>{
  if(e.button!==0)return;
  if((state==='play'||state==='count')&&!locked&&!noLock){requestLock();return;}
  if(state!=='play')return;
  if(duel)firing=true;else if(cfg.mode!=='track')shoot();
});
addEventListener('mouseup',e=>{if(e.button===0)firing=false;});
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;
  if(e.key==='Escape'&&noLock){if(state==='pause')resumeGame();else pauseGame();}
  if(k==='r'){
    if(duel&&state==='play')startReload();
    else if(state==='play'||state==='pause'||state==='result')startGame();
  }
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{firing=false;for(const k in keys)keys[k]=false;});
addEventListener('contextmenu',e=>e.preventDefault());

function aimed(){
  let best=null,bz=1e9;
  for(const t of targets){const c=toCam(t.x,t.y,t.z);if(c[2]>0&&Math.hypot(c[0],c[1])<t.r&&c[2]<bz){bz=c[2];best=t;}}
  return best;
}
function burst(t,col){
  for(let i=0;i<14;i++){const a=rnd(0,6.28),b=rnd(-1,1),s=rnd(2,6);
    parts.push({x:t.x,y:t.y,z:t.z,vx:Math.cos(a)*s,vy:b*s+1.5,vz:Math.sin(a)*s*.5,life:.5,col});}
}
function shoot(){
  shots++;flash=.08;
  const t=aimed();
  if(t){
    const ttk=performance.now()-t.born;
    hits++;combo++;if(combo>maxCombo)maxCombo=combo;ttkSum+=ttk;
    const gain=100+Math.max(0,Math.round(120-ttk/8))+Math.min(combo,30)*4;
    score+=gain;
    burst(t,cfg.color);floats.push({x:t.x,y:t.y+t.r,z:t.z,txt:'+'+gain,life:.7});
    targets.splice(targets.indexOf(t),1);spawn();
    beep(700+Math.min(combo,20)*25,.08,'triangle',.14);
  }else{
    combo=0;score=Math.max(0,score-30);beep(140,.1,'square',.05);
  }
}

/* ---------- 업데이트 / 렌더 ---------- */
function update(dt){
  timeLeft-=dt;playTime+=dt;
  if(duel){updateDuel(dt);if(state!=='play')return;}
  else if(cfg.mode==='track'){
    const t=targets[0];
    t.turn-=dt;
    if(t.turn<=0){t.turn=rnd(.4,1.4);t.vx=rnd(2.5,5)*(Math.random()<.5?-1:1);t.vy=rnd(-2,2);}
    t.x+=t.vx*dt;t.y+=t.vy*dt;
    if(t.x<-6){t.x=-6;t.vx=Math.abs(t.vx);}if(t.x>6){t.x=6;t.vx=-Math.abs(t.vx);}
    if(t.y<-1){t.y=-1;t.vy=Math.abs(t.vy);}if(t.y>4.5){t.y=4.5;t.vy=-Math.abs(t.vy);}
    onTarget=aimed()===t;
    if(onTarget){onTime+=dt;score+=600*dt;}
  }
  if(timeLeft<=0){timeLeft=0;endGame(false);}
}
function drawTargets(){
  const list=targets.map(t=>({t,c:toCam(t.x,t.y,t.z)})).filter(o=>o.c[2]>NEAR).sort((a,b)=>b.c[2]-a.c[2]);
  for(const {t,c} of list){
    t.pop=Math.min(1,t.pop+0.12);
    const sx=W/2+c[0]*focal/c[2],sy=H/2-c[1]*focal/c[2],r=t.r*focal/c[2]*(0.4+0.6*t.pop);
    const col=(cfg.mode==='track'&&onTarget)?'#7dff6b':cfg.color;
    g.save();g.shadowColor=col;g.shadowBlur=28;
    const gr=g.createRadialGradient(sx-r*.35,sy-r*.35,r*.05,sx,sy,r);
    gr.addColorStop(0,'#ffffff');gr.addColorStop(.25,col);gr.addColorStop(1,'rgba(0,0,0,.55)');
    g.fillStyle=col;g.beginPath();g.arc(sx,sy,r,0,6.2832);g.fill();
    g.shadowBlur=0;g.fillStyle=gr;g.beginPath();g.arc(sx,sy,r,0,6.2832);g.fill();
    g.restore();
  }
}
function drawFx(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}
    p.vy-=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    const c=toCam(p.x,p.y,p.z);if(c[2]<NEAR)continue;
    g.globalAlpha=Math.min(1,p.life*2);g.fillStyle=p.col;
    g.beginPath();g.arc(W/2+c[0]*focal/c[2],H/2-c[1]*focal/c[2],Math.max(1,0.07*focal/c[2]),0,6.2832);g.fill();
  }
  g.font='700 18px Segoe UI, sans-serif';g.textAlign='center';
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i];f.life-=dt;if(f.life<=0){floats.splice(i,1);continue;}
    f.y+=1.2*dt;const c=toCam(f.x,f.y,f.z);if(c[2]<NEAR)continue;
    g.globalAlpha=Math.min(1,f.life*2);g.fillStyle=f.col||'#fff';
    g.fillText(f.txt,W/2+c[0]*focal/c[2],H/2-c[1]*focal/c[2]);
  }
  g.globalAlpha=1;
}
function drawCross(){
  const x=W/2,y=H/2,k=duel?Math.min(10,spray*1.2)+(moving?5:0):(flash>0?4:0);
  g.strokeStyle=(cfg.mode==='track'&&onTarget)?'#7dff6b':'#ffffff';g.lineWidth=2;
  g.shadowColor='#000';g.shadowBlur=4;g.beginPath();
  g.moveTo(x-12-k,y);g.lineTo(x-4-k,y);g.moveTo(x+4+k,y);g.lineTo(x+12+k,y);
  g.moveTo(x,y-12-k);g.lineTo(x,y-4-k);g.moveTo(x,y+4+k);g.lineTo(x,y+12+k);g.stroke();
  g.fillStyle=g.strokeStyle;g.beginPath();g.arc(x,y,1.5,0,6.2832);g.fill();g.shadowBlur=0;
}
function hud(){
  $('hTime').textContent=timeLeft.toFixed(1);
  $('hScore').textContent=Math.round(score).toLocaleString();
  const tr=cfg.mode==='track';
  const acc=tr?(playTime?onTime/playTime*100:100):(shots?hits/shots*100:100);
  $('hAcc').textContent=acc.toFixed(0)+'%';
  $('hCombo').textContent=duel?kills:(tr?'-':combo);
}
function frame(now){
  const dt=Math.min(.05,(now-lastT)/1000||0);lastT=now;
  focal=(H/2)/Math.tan(cfg.fov*Math.PI/360);
  if(state==='menu'||(state==='result'&&!duel)){yaw=Math.sin(now/4000)*.35;pitch=Math.sin(now/5300)*.08;}
  if(state==='count'){
    const left=countEnd-now;
    if(left<=0){state='play';show('count',false);beep(880,.15,'sine',.15);}
    else $('count').textContent=Math.ceil(left/1000);
  }
  if(state==='play')update(dt);
  if(flash>0)flash-=dt;
  if(duel)drawArena(dt);else drawRoom();
  if(state!=='menu'){drawTargets();drawFx(dt);}
  if(state==='play'||state==='count'){
    if(duel)drawDuelHud(dt);
    drawCross();hud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
