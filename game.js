(function(){
const $=id=>document.getElementById(id);
const cv=$('c'),g=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();

/* ---------- 설정 ---------- */
const COLORS=['#00e5ff','#ff3d6e','#ffd166','#7dff6b','#c77dff'];
const cfg={mode:'grid',dur:60,sens:1,fov:90,size:1,color:COLORS[0],sound:true};
const MODE_NAME={grid:'그리드샷',flick:'플릭샷',track:'트래킹'};
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function bestKey(){return 'aimforge_'+cfg.mode+'_'+cfg.dur;}
function showBests(){['grid','flick','track'].forEach(m=>{const v=store('aimforge_'+m+'_'+cfg.dur);$('b_'+m).textContent=v?'최고 '+Number(v).toLocaleString():'기록 없음';});}

/* ---------- 메뉴 UI ---------- */
function pick(box,el){[...box.children].forEach(c=>c.classList.remove('on'));el.classList.add('on');}
$('modes').onclick=e=>{const c=e.target.closest('.card');if(!c)return;pick($('modes'),c);cfg.mode=c.dataset.m;};
$('durs').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;pick($('durs'),c);cfg.dur=+c.dataset.d;showBests();};
$('snd').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;pick($('snd'),c);cfg.sound=c.dataset.s==='1';};
COLORS.forEach((c,i)=>{const d=document.createElement('span');d.className='dot'+(i?'':' on');d.style.background=c;d.onclick=()=>{pick($('cols'),d);cfg.color=c;};$('cols').appendChild(d);});
[['sens',2],['fov',0],['size',2]].forEach(([k,f])=>{$(k).oninput=()=>{cfg[k]=+$(k).value;$(k+'O').textContent=cfg[k].toFixed(f);};});
showBests();

/* ---------- 사운드 ---------- */
let AC=null;
function beep(freq,dur,type,vol){
  if(!cfg.sound)return;
  try{
    if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),v=AC.createGain();
    o.type=type||'sine';o.frequency.value=freq;
    v.gain.setValueAtTime(vol||0.12,AC.currentTime);
    v.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
    o.connect(v);v.connect(AC.destination);o.start();o.stop(AC.currentTime+dur);
  }catch(e){}
}

/* ---------- 3D 카메라 ---------- */
let yaw=0,pitch=0,focal=500;
const NEAR=0.1;
function toCam(x,y,z){
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
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

/* ---------- 방 ---------- */
const R={x0:-11,x1:11,y0:-3,y1:7,z0:-8,z1:14};
function drawRoom(){
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#070b18');bg.addColorStop(1,'#0b1226');
  g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.lineWidth=1;
  // 바닥 / 천장
  g.strokeStyle='rgba(0,229,255,.22)';g.beginPath();
  for(let x=R.x0;x<=R.x1;x+=2){line3([x,R.y0,R.z0],[x,R.y0,R.z1]);line3([x,R.y1,R.z0],[x,R.y1,R.z1]);}
  for(let z=R.z0;z<=R.z1;z+=2){line3([R.x0,R.y0,z],[R.x1,R.y0,z]);line3([R.x0,R.y1,z],[R.x1,R.y1,z]);}
  g.stroke();
  // 벽
  g.strokeStyle='rgba(255,61,240,.16)';g.beginPath();
  for(let y=R.y0;y<=R.y1;y+=2){
    line3([R.x0,y,R.z1],[R.x1,y,R.z1]);line3([R.x0,y,R.z0],[R.x0,y,R.z1]);
    line3([R.x1,y,R.z0],[R.x1,y,R.z1]);line3([R.x0,y,R.z0],[R.x1,y,R.z0]);
  }
  for(let x=R.x0;x<=R.x1;x+=2){line3([x,R.y0,R.z1],[x,R.y1,R.z1]);line3([x,R.y0,R.z0],[x,R.y1,R.z0]);}
  for(let z=R.z0;z<=R.z1;z+=2){line3([R.x0,R.y0,z],[R.x0,R.y1,z]);line3([R.x1,R.y0,z],[R.x1,R.y1,z]);}
  g.stroke();
  // 모서리 강조
  g.strokeStyle='rgba(0,229,255,.6)';g.lineWidth=2;g.beginPath();
  line3([R.x0,R.y0,R.z1],[R.x1,R.y0,R.z1]);line3([R.x0,R.y1,R.z1],[R.x1,R.y1,R.z1]);
  line3([R.x0,R.y0,R.z1],[R.x0,R.y1,R.z1]);line3([R.x1,R.y0,R.z1],[R.x1,R.y1,R.z1]);
  g.stroke();
}

/* ---------- 게임 상태 ---------- */
let state='menu',targets=[],parts=[],floats=[];
let timeLeft=0,score=0,shots=0,hits=0,combo=0,maxCombo=0,ttkSum=0,onTime=0,playTime=0,flash=0,onTarget=false;
let locked=false,noLock=false,countEnd=0,lastT=0;
const rnd=(a,b)=>a+Math.random()*(b-a);

function spawn(){
  const m=cfg.mode;let t;
  for(let i=0;i<40;i++){
    if(m==='grid')t={x:rnd(-4.2,4.2),y:rnd(-0.8,3.6),z:11,r:0.55*cfg.size};
    else if(m==='flick')t={x:rnd(-7.5,7.5),y:rnd(-1.5,5),z:rnd(8,12.5),r:0.3*cfg.size};
    else t={x:rnd(-4,4),y:rnd(0,3),z:10,r:0.6*cfg.size,vx:rnd(2.5,4.5)*(Math.random()<.5?-1:1),vy:rnd(-1.5,1.5),turn:rnd(.5,1.5)};
    if(!targets.some(o=>Math.hypot(o.x-t.x,o.y-t.y,o.z-t.z)<o.r+t.r+0.5))break;
  }
  t.born=performance.now();t.pop=0;targets.push(t);
}
function reset(){
  targets=[];parts=[];floats=[];
  timeLeft=cfg.dur;score=shots=hits=combo=maxCombo=0;ttkSum=onTime=playTime=0;yaw=pitch=0;
  const n=cfg.mode==='grid'?3:1;for(let i=0;i<n;i++)spawn();
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
function toMenu(){state='menu';show('pause',false);show('result',false);show('hud',false);show('count',false);show('menu',true);showBests();if(document.pointerLockElement)document.exitPointerLock();document.body.style.cursor='';}
function pauseGame(){if(state!=='play'&&state!=='count')return;state='pause';show('count',false);show('pause',true);document.body.style.cursor='';}
function resumeGame(){show('pause',false);show('count',true);state='count';countEnd=performance.now()+1500;requestLock();if(noLock)document.body.style.cursor='none';}
function endGame(){
  state='result';if(document.pointerLockElement)document.exitPointerLock();document.body.style.cursor='';
  show('hud',false);show('result',true);beep(660,.25,'triangle',.15);setTimeout(()=>beep(880,.35,'triangle',.15),150);
  const tr=cfg.mode==='track';
  const acc=tr?(playTime?onTime/playTime*100:0):(shots?hits/shots*100:0);
  const sc=Math.max(0,Math.round(score));
  const prev=+store(bestKey())||0,isBest=sc>prev;if(isBest)store(bestKey(),sc);
  $('rMode').textContent=MODE_NAME[cfg.mode]+' · '+cfg.dur+'초';
  $('rScore').textContent=sc.toLocaleString();
  $('rGrade').textContent=isBest&&sc>0?'★ 최고 기록 갱신!':'';
  $('rAcc').textContent=acc.toFixed(1)+'%';
  $('rHitL').textContent=tr?'조준 유지 시간':'명중 / 발사';
  $('rHit').textContent=tr?onTime.toFixed(1)+'초':hits+' / '+shots;
  $('rTtkL').textContent=tr?'플레이 시간':'평균 처치 시간';
  $('rTtk').textContent=tr?playTime.toFixed(1)+'초':(hits?Math.round(ttkSum/hits)+'ms':'-');
  $('rCombo').textContent=tr?'-':maxCombo;
  $('rKps').textContent=tr?'-':(hits/cfg.dur).toFixed(2);
  $('rBest').textContent=Math.max(prev,sc).toLocaleString();
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
  if(locked){
    const k=cfg.sens*0.0013;
    yaw+=e.movementX*k;pitch-=e.movementY*k;
  }else if(noLock){
    yaw=Math.atan((e.clientX-W/2)/focal)*1.6;pitch=Math.atan(-(e.clientY-H/2)/focal)*1.6;
  }
  pitch=Math.max(-1.2,Math.min(1.2,pitch));yaw=Math.max(-1.9,Math.min(1.9,yaw));
});
cv.addEventListener('mousedown',e=>{
  if(e.button!==0)return;
  if((state==='play'||state==='count')&&!locked&&!noLock){requestLock();return;}
  if(state==='play'&&cfg.mode!=='track')shoot();
});
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&noLock){if(state==='pause')resumeGame();else pauseGame();}
  if((e.key==='r'||e.key==='R')&&(state==='play'||state==='pause'||state==='result'))startGame();
});
addEventListener('contextmenu',e=>e.preventDefault());

function aimed(){ // 조준선에 걸린 가장 가까운 타겟
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
  if(cfg.mode==='track'){
    const t=targets[0];
    t.turn-=dt;
    if(t.turn<=0){t.turn=rnd(.4,1.4);t.vx=rnd(2.5,5)*(Math.random()<.5?-1:1);t.vy=rnd(-2,2);}
    t.x+=t.vx*dt;t.y+=t.vy*dt;
    if(t.x<-6){t.x=-6;t.vx=Math.abs(t.vx);}if(t.x>6){t.x=6;t.vx=-Math.abs(t.vx);}
    if(t.y<-1){t.y=-1;t.vy=Math.abs(t.vy);}if(t.y>4.5){t.y=4.5;t.vy=-Math.abs(t.vy);}
    onTarget=aimed()===t;
    if(onTarget){onTime+=dt;score+=600*dt;}
  }
  if(timeLeft<=0){timeLeft=0;endGame();}
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
    g.globalAlpha=p.life*2;g.fillStyle=p.col;
    g.beginPath();g.arc(W/2+c[0]*focal/c[2],H/2-c[1]*focal/c[2],Math.max(1,0.07*focal/c[2]),0,6.2832);g.fill();
  }
  g.font='700 18px Segoe UI, sans-serif';g.textAlign='center';
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i];f.life-=dt;if(f.life<=0){floats.splice(i,1);continue;}
    f.y+=1.2*dt;const c=toCam(f.x,f.y,f.z);if(c[2]<NEAR)continue;
    g.globalAlpha=Math.min(1,f.life*2);g.fillStyle='#fff';
    g.fillText(f.txt,W/2+c[0]*focal/c[2],H/2-c[1]*focal/c[2]);
  }
  g.globalAlpha=1;
}
function drawCross(){
  const x=W/2,y=H/2,k=flash>0?4:0;
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
  $('hCombo').textContent=tr?'-':combo;
}
function frame(now){
  const dt=Math.min(.05,(now-lastT)/1000||0);lastT=now;
  focal=(H/2)/Math.tan(cfg.fov*Math.PI/360);
  if(state==='menu'||state==='result'){yaw=Math.sin(now/4000)*.35;pitch=Math.sin(now/5300)*.08;}
  if(state==='count'){
    const left=countEnd-now;
    if(left<=0){state='play';show('count',false);beep(880,.15,'sine',.15);}
    else $('count').textContent=Math.ceil(left/1000);
  }
  if(state==='play')update(dt);
  if(flash>0)flash-=dt;
  drawRoom();
  if(state!=='menu'){drawTargets();drawFx(dt);}
  if(state==='play'||state==='count'){drawCross();hud();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
