const $=id=>document.getElementById(id),buzz=()=>navigator.vibrate&&navigator.vibrate([15,30,15]);
const A=Audio_;A.render();
$('play').onclick=()=>{buzz();A.toggle()};$('rew').onclick=()=>A.rewind();
$('voice').onclick=e=>{A.voiceOn=!A.voiceOn;e.target.setAttribute('aria-pressed',A.voiceOn);e.target.style.opacity=A.voiceOn?1:.4;buzz()};
$('lang').onclick=e=>{A.stop();A.lang=A.lang==='tl'?'en':'tl';A.i=0;e.target.textContent=A.lang.toUpperCase();A.render()};
// Themes (remembered; suggests battery saver when battery is low)
const setTheme=t=>{const go=()=>{document.body.dataset.theme=t;try{localStorage.theme=t}catch(e){}};
 const r=$('themeSel').getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion:reduce)').matches){ // circular ripple from the selector
  document.startViewTransition(go).ready.then(()=>document.documentElement.animate({clipPath:[`circle(0 at ${x}px ${y}px)`,`circle(150vmax at ${x}px ${y}px)`]},{duration:650,easing:'ease-out',pseudoElement:'::view-transition-new(root)'})).catch(()=>{})}
 else go();$('themeSel').value=t;buzz()};
$('themeSel').onchange=e=>setTheme(e.target.value);
try{if(localStorage.theme)setTheme(localStorage.theme)}catch(e){}
navigator.getBattery&&navigator.getBattery().then(b=>{try{if(b.level<.2&&!b.charging&&!localStorage.theme)setTheme('oled')}catch(e){}});
// Share
const text=()=>`🙏 Biyaheng Ligtas — ${A.lines().join(' ')}`;
$('share').onclick=async()=>{buzz();const d={title:'Biyaheng Ligtas',text:text(),url:location.href};
 try{navigator.share?await navigator.share(d):(await navigator.clipboard.writeText(d.text+' '+d.url),alert('Nakopya na!'))}catch(e){}};
$('checkin').onclick=async()=>{buzz();const m=`Nakarating na po ako nang ligtas${$('dest').value?' sa '+$('dest').value:''}. Salamat sa Diyos! 🙏`;
 try{navigator.share?await navigator.share({text:m}):(await navigator.clipboard.writeText(m),alert('Nakopya: '+m))}catch(e){}};
// Prayer card image (1080x1920 for Stories / MyDay)
$('cardBtn').onclick=()=>{buzz();const c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,0,1920);g.addColorStop(0,'#f6d9a8');g.addColorStop(1,'#0f2a43');x.fillStyle=g;x.fillRect(0,0,1080,1920);
 x.textAlign='center';x.fillStyle='#fffdf7';x.font='bold 80px Georgia';x.fillText('Biyaheng Ligtas',540,260);
 x.font='48px Georgia';let y=520;A.lines().slice(0,4).forEach(l=>{let ln='';l.split(' ').forEach(t=>{if((ln+t).length>28){x.fillText(ln,540,y);y+=70;ln=''}ln+=t+' '});x.fillText(ln,540,y);y+=130});
 x.font='bold 56px Georgia';x.fillText($('dest').value||'Ligtas na biyahe!',540,1700);
 c.toBlob(b=>{const f=new File([b],'biyaheng-ligtas.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f]});else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;a.click()}})};
$('sos').onclick=()=>{buzz();$('sosDlg').showModal()};
// Offline banner, install prompt, service worker
const net=()=>$('offlineBar').hidden=navigator.onLine;addEventListener('online',net);addEventListener('offline',net);net();
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('install').hidden=false});
$('installBtn').onclick=async()=>{$('install').hidden=true;dp&&(dp.prompt(),dp=null)};$('installX').onclick=()=>$('install').hidden=true;
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

// Settings bindings
const A_=A;$('rate').oninput=e=>A_.rate=+e.target.value;
$('eq').onchange=e=>{A_.eq=e.target.value;A_.ctx&&A_.setEq()};
$('noise').onchange=e=>{A_.noise=e.target.checked;if(A_.playing)A_.noise?A_.startNoise():A_.stopNoise()};
$('loop').onchange=e=>A_.loop=e.target.checked;$('a432').onchange=e=>A_.a432=e.target.checked;$('spatial').onchange=e=>A_.spatial=e.target.checked;
// Golden particle burst on share / check-in
const fx=$('fx'),fc=fx.getContext('2d');let ps=[];
function burst(e){fx.width=innerWidth;fx.height=innerHeight;if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const r=e.currentTarget.getBoundingClientRect();for(let k=0;k<28;k++){const a=Math.random()*6.28,v=2+Math.random()*4;ps.push({x:r.left+r.width/2,y:r.top+r.height/2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1})}
 (function f(){fc.clearRect(0,0,fx.width,fx.height);ps=ps.filter(p=>p.l>0);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.l-=.02;fc.fillStyle=`rgba(240,182,74,${p.l})`;fc.beginPath();fc.arc(p.x,p.y,3*p.l,0,7);fc.fill()});ps.length&&requestAnimationFrame(f)})()}
['share','checkin'].forEach(id=>$(id).addEventListener('click',burst));
// Ambient light sensor -> Sunlight mode (Chrome/Android only; may need a permission or flag)
if('AmbientLightSensor' in window){try{const s=new AmbientLightSensor({frequency:1});s.onreading=()=>{if(s.illuminance>20000&&document.body.dataset.theme==='dawn')setTheme('sun')};s.onerror=()=>{};s.start()}catch(e){}}
// Bottom sheet: drag down to dismiss
(()=>{const d=$('sosDlg');let y0=null;d.addEventListener('touchstart',e=>y0=e.touches[0].clientY,{passive:true});
 d.addEventListener('touchmove',e=>{if(y0!=null)d.style.transform=`translateY(${Math.max(0,e.touches[0].clientY-y0)}px)`},{passive:true});
 d.addEventListener('touchend',e=>{const dy=e.changedTouches[0].clientY-y0;y0=null;d.style.transform='';if(dy>80)d.close()})})();

// Export a crisp 1200x630 Open Graph PNG: SVG -> <img> -> canvas -> download. Save as og.png in the site root.
function exportOG(){buzz();const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d9a8"/><stop offset="1" stop-color="#0f2a43"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><g transform="translate(150 315)" fill="none" stroke="#f0b64a" stroke-width="14" stroke-linecap="round"><circle r="110"/><path d="M0-80V80M-80 0H80"/></g><text x="320" y="280" font-family="Georgia,serif" font-size="84" font-weight="700" fill="#fffdf7">Biyaheng Ligtas</text><text x="320" y="350" font-family="Georgia,serif" font-size="30" fill="#fffdf7">${esc(A.lines()[0])}</text><text x="320" y="450" font-family="Georgia,serif" font-size="40" fill="#f0b64a">${esc($('dest').value||'Ligtas na biyahe!')}</text></svg>`;
 const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=1200;c.height=630;c.getContext('2d').drawImage(img,0,0);
  c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='og.png';a.click()})};
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
$('ogBtn').onclick=exportOG;
