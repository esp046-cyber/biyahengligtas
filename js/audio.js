/* Prayer engine: synthesized ambient pad + speechSynthesis + Media Session */
const PRAYER_SRC={
 tl:["Panginoon, bago kami humayo, basbasan Mo po ang aming biyahe.","San Cristobal, patron ng mga manlalakbay, ipanalangin mo kaming ligtas.","Birhen ng Biyaheng Mabuti, gabayan mo ang bawat daan at bawat gulong.","Ingatan Mo ang mga tsuper, ang mga kasama, at ang mga naghihintay sa amin.","Ilayo Mo kami sa sakuna at pagkaantala; bigyan kami ng pasensya at malinaw na isip.","At kung makarating man kami, nawa'y may pasasalamat kami sa puso. Amen."],
 en:["Lord, before we set out, bless our journey.","St. Christopher, patron of travelers, pray for our safety.","Our Lady of Good Voyage, guide every road and every wheel.","Protect our drivers, our companions, and those waiting for us at home.","Keep us from harm and delay; grant us patience and a clear mind.","And when we arrive, let gratitude fill our hearts. Amen."]};
/* Respells Tagalog for English-only TTS voices. Every replacement is ONE token, so word counts still match the on-screen text. */
const PHON={panginoon:'Pangeenoon',ipanalangin:'Eepanalangin',manlalakbay:'Manlalakbai',biyahe:'Biyaye',biyaheng:'Biyayeng',humayo:'Hoomayo',cristobal:'Kristobal',birhen:'Beerhen',mabuti:'Mabooti',ingatan:'Eengatan',tsuper:'Chooper',sakuna:'Sakoona',pasensya:'Pasensiya',malinaw:'Malinao',naghihintay:'Naghiheentai',ilayo:'Eelayo',puso:'Pooso',ng:'nang'};
const BREATH=new Set(['at','kung','and','bigyan','grant']); // clause starters that get a comma-breath before them
const ROBOTIC=/espeak|mbrola|compact|zarvox|trinoids|bad news|good news|bahh|bells|boing|bubbles|cellos|deranged|hysterical|organ|pipe|superstar|whisper|wobble|albert|fred|junior|kathy|ralph|princess|agnes|bruce/i;
function sanitizeForFilipinoTTS(t){return t.replace(/[A-Za-zÀ-ÿ]+/g,w=>{const r=PHON[w.toLowerCase()];return r?(w[0]===w[0].toUpperCase()?r:r.toLowerCase()):w})}
/* Prayer = lines of {text, phonetic} tokens. The DOM shows .text; the voice reads .phonetic; highlighting is by token index. Edit PHON to tune pronunciation. */
const tokenize=(l,tl)=>l.split(' ').map(w=>({text:w,phonetic:tl?sanitizeForFilipinoTTS(w):w}));
const PRAYER={tl:PRAYER_SRC.tl.map(l=>tokenize(l,true)),en:PRAYER_SRC.en.map(l=>tokenize(l,false))};
const Audio_={lang:'tl',i:0,playing:false,voiceOn:true,rate:.85,mine:false,theta:false,useRec:false,recBuf:null,recTried:false,loop:false,noise:false,a432:true,spatial:true,eq:'default',loops:0,ctx:null,nodes:[],tok:0,paused:false,env:0,tm:[],sil:null,
 lines(){return PRAYER[this.lang].map(l=>l.map(t=>t.text).join(' '))}, // plain strings for share/cards
 render(){document.getElementById('prayer').innerHTML=PRAYER[this.lang].map(l=>'<p>'+l.map((t,n)=>`<span data-n="${n}">${t.text}</span>`).join(' ')+'</p>').join('');this.mark();this.pill()},
 progress(){const m=navigator.mediaSession;if(m&&m.setPositionState)try{m.setPositionState({duration:this.lines().length,playbackRate:1,position:Math.min(this.i,this.lines().length)})}catch(e){}},
 mark(){this.progress();document.querySelectorAll('#prayer p').forEach((p,k)=>p.classList.toggle('on',k===this.i&&this.playing));
  const a=document.querySelector('#prayer p.on');a&&a.scrollIntoView({block:'center',behavior:'smooth'});
  document.getElementById('ring').style.strokeDashoffset=339.3*(1-(this.i+(this.playing?.5:0))/this.lines().length)},
 // Graph: bus -> duck -> eq -> HRTF panner -> compressor -> out, with a convolver reverb send; analyser on the output
 init(){if(this.ctx)return this.ctx.resume();
  const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();
  this.master=c.createDynamicsCompressor();this.master.connect(c.destination);
  this.an=c.createAnalyser();this.an.fftSize=128;this.master.connect(this.an);
  this.eqN=c.createBiquadFilter();this.setEq();
  this.pan=c.createPanner();this.pan.panningModel='HRTF';this.pan.positionZ&&(this.pan.positionZ.value=-1);
  this.duck=c.createGain();this.bus=c.createGain();
  const rv=c.createConvolver(),len=c.sampleRate*2.8,b=c.createBuffer(2,len,c.sampleRate),wet=c.createGain();wet.gain.value=.18;
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let k=0;k<len;k++)d[k]=(Math.random()*2-1)*Math.pow(1-k/len,3)} // synthesized impulse response
  this.rv=rv;rv.buffer=b;this.bus.connect(this.duck);this.duck.connect(this.eqN);this.duck.connect(rv);rv.connect(wet);wet.connect(this.eqN);
  this.eqN.connect(this.pan);this.pan.connect(this.master)},
 setEq(){const [t,f,g]={default:['peaking',1000,0],terminal:['peaking',2500,8],flight:['lowpass',1400,0]}[this.eq];
  Object.assign(this.eqN,{type:t});this.eqN.frequency.value=f;this.eqN.gain.value=g;this.eqN.Q.value=.8},
 setDuck(v){this.duck&&this.duck.gain.setTargetAtTime(v,this.ctx.currentTime,.4)},
 pad(){this.init();const c=this.ctx,r=this.a432?432/440:1,g=c.createGain();
  g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(.09,c.currentTime+3);g.connect(this.bus);
  this.nodes=[130.81,196,261.63,329.63].map((f,k)=>{const o=c.createOscillator();o.frequency.value=f*r;o.detune.value=k*4-6;o.connect(g);o.start();return o});
  this.padGain=g;if(this.noise)this.startNoise();if(this.theta)this.startTheta()},
 stopPad(){const c=this.ctx;if(!c||!this.padGain)return;this.padGain.gain.linearRampToValueAtTime(0,c.currentTime+1.5);
  const n=this.nodes;this.nodes=[];setTimeout(()=>n.forEach(o=>o.stop()),1600);this.stopNoise();this.stopTheta()},
 startNoise(){if(this.nz||!this.ctx)return;const c=this.ctx,len=c.sampleRate*4,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);let l=0;
  for(let k=0;k<len;k++){l=(l+.02*(Math.random()*2-1))/1.02;d[k]=l*3.5} // brown noise: integrated white noise
  const s=this.nz=c.createBufferSource(),g=c.createGain();s.buffer=b;s.loop=true;g.gain.value=.25;s.connect(g);g.connect(this.eqN);s.start()},
 stopNoise(){this.nz&&(this.nz.stop(),this.nz=null)},
 bell(f=523){this.init();const c=this.ctx,t=c.currentTime,r=this.a432?.982:1; // additive inharmonic partials, exponential decay
  [[1,1],[2.4,.5],[3,.35],[4.2,.2]].forEach(([m,a])=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f*m*r;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*a,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+4/m**.3);
   o.connect(g);g.connect(this.bus);o.start(t);o.stop(t+4.2)})},
 pickVoice(){const all=speechSynthesis.getVoices().filter(x=>!ROBOTIC.test(x.name)),L=x=>x.lang.toLowerCase().replace('_','-');
  const fil=x=>/^(tl|fil)/.test(L(x))||/filipino|tagalog/i.test(x.name),en=x=>L(x).startsWith('en');
  const nat=x=>/natural|neural|online|siri|google uk english female|samantha|karen|moira|tessa|serena|victoria|zira|aria|jenny|libby|sonia|fiona|female/i.test(x.name);
  const best=l=>l.find(nat)||l[0]||null,pick=(...ps)=>{for(const p of ps){const m=all.filter(p);if(m.length)return best(m)}return null};
  const eng=[x=>L(x)==='en-ph',x=>en(x)&&nat(x),en];
  return this.lang==='tl'?pick(fil,...eng):pick(...eng)}, // Filipino -> en-PH -> natural English female -> any English; novelty/robotic voices filtered
 speak(){if(!this.playing)return;const t=this.lines()[this.i],k=this.i,tok=++this.tok;this.clr();this.mark();navigator.vibrate&&navigator.vibrate(12);
  const words=t.split(' ').length,ms=60000/(150*this.rate); // calculated words-per-minute clock
  const tick=()=>{let n=0;const iv=setInterval(()=>{if(tok!==this.tok||n>=words)return clearInterval(iv);this.hi(k,n++)},ms);this.tm.push(iv)};
  if(!this.voiceOn||!('speechSynthesis' in window)){tick();this.tm.push(setTimeout(()=>tok===this.tok&&this.next(),words*ms+800));return}
  const v=this.pickVoice(),eng=!v||!/^(fil|tl)/i.test(v.lang),usePh=this.lang==='tl'&&eng;let spoken='';
  const starts=PRAYER[this.lang][k].map((x,n,arr)=>{const s=spoken.length;let w=usePh?x.phonetic:x.text,nx=arr[n+1];
   if(nx&&!/[,.;:!?—]$/.test(w)){if(BREATH.has(nx.text.toLowerCase()))w+=',';else if(/^amen/i.test(nx.text))w+=' —'} // breathing pauses
   spoken+=w+' ';return s});spoken=spoken.trim(); // char offset of every token
  const u=window.activeUtterance=new SpeechSynthesisUtterance(spoken); // global ref stops Chrome/iOS GC from cutting the prayer off
  if(v){u.voice=v;u.lang=v.lang}else u.lang='en-US';
  u.rate=this.rate;u.pitch=.92;let got=false;
  u.onstart=()=>{if(tok!==this.tok)return;this.setDuck(.4); // duck only once the voice is really speaking
   this.tm.push(setTimeout(()=>{if(!got&&tok===this.tok)tick()},1000))}; // no boundary events within 1s -> WPM highlighter
  u.onboundary=e=>{if(tok!==this.tok||(e.name&&e.name!=='word'))return;if(!got){got=true;this.clr()}
   this.hi(k,starts.reduce((r,s,n)=>s<=e.charIndex?n:r,0))}; // token index, never string-sliced display text
  u.onend=()=>{if(tok!==this.tok)return;this.setDuck(1);this.clr();clearTimeout(this.wd);this.tm.push(setTimeout(()=>this.next(),1400))};
  u.onerror=()=>{if(tok!==this.tok)return;clearTimeout(this.wd);this.setDuck(1);this.clr();this.tm.push(setTimeout(()=>this.next(),2500))};
  speechSynthesis.speak(u);clearTimeout(this.wd);
  this.wd=setTimeout(()=>{if(tok===this.tok&&this.playing&&!this.paused){this.tok++;speechSynthesis.cancel();this.setDuck(1);this.next()}},words*ms*1.8+5000)},
 voiceNode(){const c=this.ctx;if(!this.vg){this.vg=c.createGain();this.vg.connect(this.eqN);this.vg.connect(this.rv)}return this.vg},
 enableRec(){this.setMode(true)},
 async useBlob(b){const ab=await b.arrayBuffer();this.recBuf=await new Promise((ok,no)=>this.ctx.decodeAudioData(ab,ok,no));this.cues=null;this.enableRec()},
 async loadRec(){if(this.recTried||!this.ctx)return;this.recTried=true;
  try{for(const key of ['mine','bundledAudioFallback']){const b=await this.idb(s=>s.get(key));if(b){this.mine=true;await this.useBlob(b);return}}}catch(e){} // family recording wins
  for(const f of ['prayer-audio.opus','prayer-audio.webm','prayer-audio.mp3']){try{const r=await fetch(f);if(!r.ok)continue;
   await this.useBlob(await r.blob());
   try{const j=await fetch('prayer-audio.json');if(j.ok)this.cues=await j.json()}catch(e){} // optional [[line,word,seconds],...] timings
   return}catch(e){}}},
 idb(fn){return new Promise((ok,no)=>{const r=indexedDB.open('biyahe',1);r.onupgradeneeded=()=>r.result.createObjectStore('v');r.onsuccess=()=>{const q=fn(r.result.transaction('v','readwrite').objectStore('v'));q.onsuccess=()=>ok(q.result);q.onerror=no};r.onerror=no})},
 pill(){const p=document.getElementById('natPill');if(p)p.hidden=!(this.useRec&&this.recBuf&&this.lang==='tl')}, // shown only while the recording is what will actually play
 toast(m){const t=document.getElementById('toast');t.textContent=m;t.hidden=false;clearTimeout(this.tt);this.tt=setTimeout(()=>t.hidden=true,4500)},
 setMode(nat){const was=this.useRec;this.useRec=!!(nat&&this.recBuf);const $=id=>document.getElementById(id);
  $('vNat').disabled=!this.recBuf;$('vNat').setAttribute('aria-pressed',this.useRec);$('vTts').setAttribute('aria-pressed',!this.useRec);
  $('recPrev').disabled=!this.recBuf;$('recDel').disabled=!this.mine;this.pill();
  if(was!==this.useRec&&this.playing){this.tok++;this.clr();clearTimeout(this.wd);speechSynthesis.cancel();try{this.src&&(this.src.onended=null,this.src.stop())}catch(e){}this.src=null;this.i=0;this.begin()}},
 async keep(b,key='mine'){this.mine=true;await this.useBlob(b);await this.idb(s=>s.put(b,key));
  await this.idb(s=>s.delete(key==='mine'?'bundledAudioFallback':'mine'));navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}, // latest choice wins; ask the browser not to evict it // stays on this device
 async importFile(f){if(!f)return;if(f.size>15e6)return this.toast('Masyadong malaki ang file (max 15 MB).');
  try{this.init();await this.keep(f,'bundledAudioFallback');this.toast('Na-load at na-save ang audio.')}catch(e){this.toast('Hindi ma-decode ang audio. Subukan ang .mp3 o .m4a.')}},
 async clearRec(){try{await this.idb(s=>s.delete('mine'));await this.idb(s=>s.delete('bundledAudioFallback'))}catch(e){}this.mine=false;this.recBuf=null;this.cues=null;this.recTried=false;this.setMode(false);
  await this.loadRec();this.toast(this.recBuf?'Binalik sa naka-bundle na boses.':'Nabura na ang recording.')},
 preview(){if(this.pv){try{this.pv.stop()}catch(e){}this.pv=null;return}if(!this.recBuf)return;this.init();
  const s=this.pv=this.ctx.createBufferSource();s.buffer=this.recBuf;s.connect(this.voiceNode());s.onended=()=>this.pv=null;s.start()},
 async record(){if(this.mr&&this.mr.state==='recording'){this.mr.stop();return}
  if(!navigator.mediaDevices||!window.MediaRecorder)return this.toast('Hindi sinusuportahan ng browser na ito ang pag-record.');
  let st;try{st=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){return this.toast(e.name==='NotAllowedError'?'Hindi pinayagan ang mikropono. I-enable ito sa settings ng browser.':'Walang mikropono na nahanap.')}
  this.init();const ch=[],btn=document.getElementById('recBtn'),rt=document.getElementById('recTime'),fmt=s=>'0'+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  let sec=0;rt.textContent=fmt(0)+' / 01:00';const tt=setInterval(()=>rt.textContent=fmt(++sec)+' / 01:00',1000);
  const mr=this.mr=new MediaRecorder(st);mr.ondataavailable=e=>ch.push(e.data);btn.textContent='⏹ Itigil';
  mr.onstop=async()=>{clearInterval(tt);st.getTracks().forEach(t=>t.stop());btn.textContent='🎙 Itala ang boses';
   try{await this.keep(new Blob(ch,{type:mr.mimeType}));this.toast('Na-save ang recording ('+fmt(sec)+').')}catch(e){this.toast('Hindi ma-save o ma-decode ang recording.')}};
  mr.start();setTimeout(()=>mr.state==='recording'&&mr.stop(),60000)},
 startTheta(){if(this.th||!this.ctx)return;const c=this.ctx,m=c.createChannelMerger(2),g=c.createGain();g.gain.value=.05;
  const mk=(f,ch)=>{const o=c.createOscillator();o.frequency.value=f;o.connect(m,0,ch);o.start();return o};
  this.th=[mk(200,0),mk(206,1)];m.connect(g);g.connect(this.master)}, // 200 Hz left / 206 Hz right = 6 Hz beat; skips the panner so channels stay separate
 stopTheta(){this.th&&this.th.forEach(o=>o.stop());this.th=null},
 nap(min,on){clearTimeout(this.napT);if(!on){this.playing||this.keepAlive(false);return}this.init();this.keepAlive(true);
  window.Notification&&Notification.permission==='default'&&Notification.requestPermission();
  this.padGain&&this.padGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+20); // ambient fades out so the traveler can sleep
  this.napT=setTimeout(()=>{[0,4,8].forEach(s=>setTimeout(()=>this.bell(659),s*1000));navigator.vibrate&&navigator.vibrate([300,150,300]);
   window.Notification&&Notification.permission==='granted'&&new Notification('Biyaheng Ligtas',{body:'Malapit na ang destinasyon — mga 5 minuto na lang. 🙏'});this.playing||this.keepAlive(false)},Math.max(min-5,0)*60000)},
 begin(){this.useRec&&this.recBuf&&this.lang==='tl'?this.playRec():this.speak()},
 playRec(){const c=this.ctx,tok=++this.tok;this.clr();const flat=[];let tot=0;
  PRAYER.tl.forEach((l,k)=>l.forEach((t,n)=>{flat.push({k,n,s:tot});tot+=t.text.length+1}));
  const s=this.src=c.createBufferSource();s.buffer=this.recBuf;s.connect(this.voiceNode());this.pan.positionX&&(this.pan.positionX.value=0); // voice -> EQ -> reverb send -> compressor -> analyser
  const t0=c.currentTime,dur=this.recBuf.duration;this.setDuck(.4);
  this.tm.push(setInterval(()=>{if(tok!==this.tok)return;const f=(c.currentTime-t0)/dur*tot;let cur=flat[0];for(const x of flat){if(x.s<=f)cur=x;else break}
   if(this.cues){const el=c.currentTime-t0;for(const q of this.cues){if(q[2]<=el)cur={k:q[0],n:q[1]};else break}} // exact timings when provided
   if(cur.k!==this.i){this.i=cur.k;this.mark();navigator.vibrate&&navigator.vibrate(12)}this.hi(cur.k,cur.n)},120)); // text follows the recording by character share
  s.onended=()=>{if(tok!==this.tok)return;this.setDuck(1);this.clr();this.i=this.lines().length-1;this.next()};s.start()},
 keepAlive(on){if(!this.sil){const n=8000,b=new Uint8Array(44+n),dv=new DataView(b.buffer),w=(o,s)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));
   w(0,'RIFF');dv.setUint32(4,36+n,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
   dv.setUint32(24,8000,true);dv.setUint32(28,8000,true);dv.setUint16(32,1,true);dv.setUint16(34,8,true);w(36,'data');dv.setUint32(40,n,true);b.fill(128,44);
   let s='';b.forEach(x=>s+=String.fromCharCode(x));this.sil=new Audio('data:audio/wav;base64,'+btoa(s));this.sil.loop=true} // 1s silent WAV keeps the iOS audio session alive
  on?this.sil.play().catch(()=>{}):this.sil.pause()},
 next(){if(!this.playing)return;if(++this.i>=this.lines().length){this.i=0;
   if(this.loop){this.loops++;this.bell(523);this.nodes.forEach(o=>o.detune.linearRampToValueAtTime(this.loops%3*200,this.ctx.currentTime+4)); // key drift each pass
    this.begin();return}
   this.bell(392);this.stop();return}this.speak()},
 play(){if(this.playing)return;this.keepAlive(true);this.playing=true;this.pad();this.bell(523);this.meta();this.begin();this.ui();this.viz();
  navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>this.wl=l).catch(()=>{})},
 stop(){this.playing=false;clearTimeout(this.wd);try{this.src&&(this.src.onended=null,this.src.stop())}catch(e){}this.src=null;this.paused=false;this.tok++;this.clr();this.keepAlive(false);speechSynthesis.cancel();this.stopPad();this.mark();this.ui();this.wl&&this.wl.release().catch(()=>{});this.wl=null},
 toggle(){if(this.paused)this.mediaPlay();else this.playing?this.stop():this.play()},
 mediaPause(){if(!this.playing||this.paused)return;this.paused=true;speechSynthesis.pause();this.ctx&&this.ctx.suspend();this.sil&&this.sil.pause();this.ui()},
 mediaPlay(){this.ctx&&this.ctx.resume();this.sil&&this.sil.play().catch(()=>{});
  if(!this.playing){this.play();return}if(!this.paused)return;this.paused=false;this.ui();speechSynthesis.resume();
  setTimeout(()=>{if(this.playing&&speechSynthesis.paused){this.tok++;this.clr();speechSynthesis.cancel();this.speak()}},200)}, // iOS failed to resume -> restart this line

 rewind(){if(this.src&&this.playing){this.tok++;this.clr();try{this.src.onended=null;this.src.stop()}catch(e){}this.i=0;this.playRec();return}const was=this.playing;this.tok++;this.clr();speechSynthesis.cancel();this.i=0;if(was)setTimeout(()=>this.speak(),100);else this.mark()},
 viz(){const w=document.getElementById('wl'),d=new Uint8Array(64);let t=0;
  const f=()=>{if(!this.playing)return;this.an.getByteTimeDomainData(d);
   let pk=6;for(const v of d)pk=Math.max(pk,Math.abs(v-128));this.agc=Math.max(pk,(this.agc||pk)*.99); // slow-release auto-gain: quiet files still move
   w.setAttribute('points',[...d].map((v,k)=>`${k*200/63},${Math.max(2,Math.min(38,20+(v-128)/this.agc*14*(.5+this.env*.6)+this.env*Math.sin(k*.7+t*30)*5))}`).join(' '));t+=.01;this.env*=.93;
   if(this.spatial&&this.pan.positionX&&!this.src)this.pan.positionX.value=Math.sin(t)*1.5;requestAnimationFrame(f)};f()},
 ui(){document.getElementById('play').textContent=this.playing&&!this.paused?'⏸':'▶';
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=this.playing?(this.paused?'paused':'playing'):'none'},
 meta(){if(!('mediaSession' in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:'Panalangin Bago Bumiyahe',artist:'Biyaheng Ligtas',album:'Gabay sa Paglalakbay',artwork:[{src:'favicon.svg',sizes:'512x512',type:'image/svg+xml'}]});
  navigator.mediaSession.setActionHandler('play',()=>this.mediaPlay());navigator.mediaSession.setActionHandler('pause',()=>this.mediaPause());
  navigator.mediaSession.setActionHandler('previoustrack',()=>this.rewind())}};

// Mobile autoplay safeguard: create/resume the AudioContext on any user gesture.
['touchstart','click','keydown'].forEach(ev=>addEventListener(ev,()=>{try{Audio_.init();Audio_.loadRec()}catch(e){}},{passive:true}));
