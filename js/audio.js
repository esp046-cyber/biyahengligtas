/* Prayer engine: synthesized ambient pad + speechSynthesis + Media Session */
const PRAYER_SRC={
 tl:["Panginoon, bago kami humayo, basbasan Mo po ang aming biyahe.","San Cristobal, patron ng mga manlalakbay, ipanalangin mo kaming ligtas.","Birhen ng Biyaheng Mabuti, gabayan mo ang bawat daan at bawat gulong.","Ingatan Mo ang mga tsuper, ang mga kasama, at ang mga naghihintay sa amin.","Ilayo Mo kami sa sakuna at pagkaantala; bigyan kami ng pasensya at malinaw na isip.","At kung makarating man kami, nawa'y may pasasalamat kami sa puso. Amen."],
 en:["Lord, before we set out, bless our journey.","St. Christopher, patron of travelers, pray for our safety.","Our Lady of Good Voyage, guide every road and every wheel.","Protect our drivers, our companions, and those waiting for us at home.","Keep us from harm and delay; grant us patience and a clear mind.","And when we arrive, let gratitude fill our hearts. Amen."]};
/* Respells Tagalog for English-only TTS voices. Every replacement is ONE token, so word counts still match the on-screen text. */
const PHON={panginoon:'Pang-ee-no-on',ipanalangin:'Ee-pah-nah-lah-ngin',manlalakbay:'Mahn-lah-lahk-bye',basbasan:'Bahs-bah-sahn',biyahe:'Bee-yah-heh',biyaheng:'Bee-yah-heng',humayo:'Hoo-mah-yo',cristobal:'Krees-toh-bahl',birhen:'Beer-hen',mabuti:'Mah-boo-tee',gabayan:'Gah-bah-yahn',ingatan:'Ee-ngah-tahn',tsuper:'Choo-per',sakuna:'Sah-koo-nah',pagkaantala:'Pahg-kah-ahn-tah-lah',pasasalamat:'Pah-sah-sah-lah-maht',pasensya:'Pah-sen-syah',malinaw:'Mah-lee-now',makarating:'Mah-kah-rah-ting',naghihintay:'Nahg-hee-hee-tie',kasama:'Kah-sah-mah',ilayo:'Ee-lah-yo',aming:'Ah-ming',puso:'Poo-so',ng:'nang'};
function sanitizeForFilipinoTTS(t){return t.replace(/[A-Za-zÀ-ÿ]+/g,w=>{const r=PHON[w.toLowerCase()];return r?(w[0]===w[0].toUpperCase()?r:r.toLowerCase()):w})}
/* Prayer = lines of {text, phonetic} tokens. The DOM shows .text; the voice reads .phonetic; highlighting is by token index. Edit PHON to tune pronunciation. */
const tokenize=(l,tl)=>l.split(' ').map(w=>({text:w,phonetic:tl?sanitizeForFilipinoTTS(w):w}));
const PRAYER={tl:PRAYER_SRC.tl.map(l=>tokenize(l,true)),en:PRAYER_SRC.en.map(l=>tokenize(l,false))};
const Audio_={lang:'tl',i:0,playing:false,voiceOn:true,rate:.85,loop:false,noise:false,a432:true,spatial:true,eq:'default',loops:0,ctx:null,nodes:[],tok:0,paused:false,env:0,tm:[],sil:null,
 lines(){return PRAYER[this.lang].map(l=>l.map(t=>t.text).join(' '))}, // plain strings for share/cards
 render(){document.getElementById('prayer').innerHTML=PRAYER[this.lang].map(l=>'<p>'+l.map((t,n)=>`<span data-n="${n}">${t.text}</span>`).join(' ')+'</p>').join('');this.mark()},
 mark(){document.querySelectorAll('#prayer p').forEach((p,k)=>p.classList.toggle('on',k===this.i&&this.playing));
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
  rv.buffer=b;this.bus.connect(this.duck);this.duck.connect(this.eqN);this.duck.connect(rv);rv.connect(wet);wet.connect(this.eqN);
  this.eqN.connect(this.pan);this.pan.connect(this.master)},
 setEq(){const [t,f,g]={default:['peaking',1000,0],terminal:['peaking',2500,8],flight:['lowpass',1400,0]}[this.eq];
  Object.assign(this.eqN,{type:t});this.eqN.frequency.value=f;this.eqN.gain.value=g;this.eqN.Q.value=.8},
 setDuck(v){this.duck&&this.duck.gain.setTargetAtTime(v,this.ctx.currentTime,.4)},
 pad(){this.init();const c=this.ctx,r=this.a432?432/440:1,g=c.createGain();
  g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(.09,c.currentTime+3);g.connect(this.bus);
  this.nodes=[130.81,196,261.63,329.63].map((f,k)=>{const o=c.createOscillator();o.frequency.value=f*r;o.detune.value=k*4-6;o.connect(g);o.start();return o});
  this.padGain=g;if(this.noise)this.startNoise()},
 stopPad(){const c=this.ctx;if(!c||!this.padGain)return;this.padGain.gain.linearRampToValueAtTime(0,c.currentTime+1.5);
  const n=this.nodes;this.nodes=[];setTimeout(()=>n.forEach(o=>o.stop()),1600);this.stopNoise()},
 startNoise(){if(this.nz||!this.ctx)return;const c=this.ctx,len=c.sampleRate*4,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);let l=0;
  for(let k=0;k<len;k++){l=(l+.02*(Math.random()*2-1))/1.02;d[k]=l*3.5} // brown noise: integrated white noise
  const s=this.nz=c.createBufferSource(),g=c.createGain();s.buffer=b;s.loop=true;g.gain.value=.25;s.connect(g);g.connect(this.eqN);s.start()},
 stopNoise(){this.nz&&(this.nz.stop(),this.nz=null)},
 bell(f=523){this.init();const c=this.ctx,t=c.currentTime,r=this.a432?.982:1; // additive inharmonic partials, exponential decay
  [[1,1],[2.4,.5],[3,.35],[4.2,.2]].forEach(([m,a])=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f*m*r;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*a,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+4/m**.3);
   o.connect(g);g.connect(this.bus);o.start(t);o.stop(t+4.2)})},
 pickVoice(){const v=speechSynthesis.getVoices(),want=this.lang==='tl'?['fil','tl']:['en'];
  const m=v.filter(x=>want.some(w=>x.lang.toLowerCase().startsWith(w)));
  return m.find(x=>/female|samantha|karen|victoria|google/i.test(x.name))||m[0]||null},
 clr(){this.tm.forEach(t=>{clearTimeout(t);clearInterval(t)});this.tm=[]},
 hi(k,idx){[...document.querySelectorAll('#prayer p')[k].children].forEach((s,n)=>s.classList.toggle('w',n===idx));this.env=1}, // env kicks the visualizer
 speak(){if(!this.playing)return;const t=this.lines()[this.i],k=this.i,tok=++this.tok;this.clr();this.mark();navigator.vibrate&&navigator.vibrate(12);
  const words=t.split(' ').length,ms=60000/(150*this.rate); // calculated words-per-minute clock
  const tick=()=>{let n=0;const iv=setInterval(()=>{if(tok!==this.tok||n>=words)return clearInterval(iv);this.hi(k,n++)},ms);this.tm.push(iv)};
  if(!this.voiceOn||!('speechSynthesis' in window)){tick();this.tm.push(setTimeout(()=>tok===this.tok&&this.next(),words*ms+800));return}
  const v=this.pickVoice(),eng=!v||!/^(fil|tl)/i.test(v.lang),usePh=this.lang==='tl'&&eng;let spoken='';
  const starts=PRAYER[this.lang][k].map(x=>{const s=spoken.length;spoken+=(usePh?x.phonetic:x.text)+' ';return s});spoken=spoken.trim(); // char offset of every token
  const u=window.activeUtterance=new SpeechSynthesisUtterance(spoken); // global ref stops Chrome/iOS GC from cutting the prayer off
  if(v){u.voice=v;u.lang=v.lang}else u.lang=this.lang==='tl'?'fil-PH':'en-US';
  u.rate=this.rate;u.pitch=1.1;let got=false;
  u.onstart=()=>{if(tok!==this.tok)return;this.setDuck(.4); // duck only once the voice is really speaking
   this.tm.push(setTimeout(()=>{if(!got&&tok===this.tok)tick()},1000))}; // no boundary events within 1s -> WPM highlighter
  u.onboundary=e=>{if(tok!==this.tok||(e.name&&e.name!=='word'))return;if(!got){got=true;this.clr()}
   this.hi(k,starts.reduce((r,s,n)=>s<=e.charIndex?n:r,0))}; // token index, never string-sliced display text
  u.onend=()=>{if(tok!==this.tok)return;this.setDuck(1);this.clr();this.tm.push(setTimeout(()=>this.next(),500))};
  u.onerror=()=>{if(tok!==this.tok)return;this.setDuck(1);this.clr();this.tm.push(setTimeout(()=>this.next(),2500))};
  speechSynthesis.speak(u)},
 keepAlive(on){if(!this.sil){const n=8000,b=new Uint8Array(44+n),dv=new DataView(b.buffer),w=(o,s)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));
   w(0,'RIFF');dv.setUint32(4,36+n,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
   dv.setUint32(24,8000,true);dv.setUint32(28,8000,true);dv.setUint16(32,1,true);dv.setUint16(34,8,true);w(36,'data');dv.setUint32(40,n,true);b.fill(128,44);
   let s='';b.forEach(x=>s+=String.fromCharCode(x));this.sil=new Audio('data:audio/wav;base64,'+btoa(s));this.sil.loop=true} // 1s silent WAV keeps the iOS audio session alive
  on?this.sil.play().catch(()=>{}):this.sil.pause()},
 next(){if(!this.playing)return;if(++this.i>=this.lines().length){this.i=0;
   if(this.loop){this.loops++;this.bell(523);this.nodes.forEach(o=>o.detune.linearRampToValueAtTime(this.loops%3*200,this.ctx.currentTime+4)); // key drift each pass
    this.speak();return}
   this.bell(392);this.stop();return}this.speak()},
 play(){if(this.playing)return;this.keepAlive(true);this.playing=true;this.pad();this.bell(523);this.meta();this.speak();this.ui();this.viz();
  navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>this.wl=l).catch(()=>{})},
 stop(){this.playing=false;this.paused=false;this.tok++;this.clr();this.keepAlive(false);speechSynthesis.cancel();this.stopPad();this.mark();this.ui();this.wl&&this.wl.release().catch(()=>{});this.wl=null},
 toggle(){if(this.paused)this.mediaPlay();else this.playing?this.stop():this.play()},
 mediaPause(){if(!this.playing||this.paused)return;this.paused=true;speechSynthesis.pause();this.ctx&&this.ctx.suspend();this.sil&&this.sil.pause();this.ui()},
 mediaPlay(){this.ctx&&this.ctx.resume();this.sil&&this.sil.play().catch(()=>{});
  if(!this.playing){this.play();return}if(!this.paused)return;this.paused=false;this.ui();speechSynthesis.resume();
  setTimeout(()=>{if(this.playing&&speechSynthesis.paused){this.tok++;this.clr();speechSynthesis.cancel();this.speak()}},200)}, // iOS failed to resume -> restart this line

 rewind(){const was=this.playing;this.tok++;this.clr();speechSynthesis.cancel();this.i=0;if(was)setTimeout(()=>this.speak(),100);else this.mark()},
 viz(){const w=document.getElementById('wl'),d=new Uint8Array(64);let t=0;
  const f=()=>{if(!this.playing)return;this.an.getByteTimeDomainData(d);
   w.setAttribute('points',[...d].map((v,k)=>`${k*200/63},${20+(v-128)/5*(.4+this.env*1.4)+this.env*Math.sin(k*.7+t*30)*9}`).join(' '));t+=.01;this.env*=.93;
   if(this.spatial&&this.pan.positionX)this.pan.positionX.value=Math.sin(t)*1.5;requestAnimationFrame(f)};f()},
 ui(){document.getElementById('play').textContent=this.playing&&!this.paused?'⏸':'▶';
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=this.playing&&!this.paused?'playing':'paused'},
 meta(){if(!('mediaSession' in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:'Panalangin Bago Bumiyahe',artist:'Biyaheng Ligtas',album:'Gabay sa Paglalakbay',artwork:[{src:'favicon.svg',sizes:'512x512',type:'image/svg+xml'}]});
  navigator.mediaSession.setActionHandler('play',()=>this.mediaPlay());navigator.mediaSession.setActionHandler('pause',()=>this.mediaPause());
  navigator.mediaSession.setActionHandler('previoustrack',()=>this.rewind())}};

// Mobile autoplay safeguard: create/resume the AudioContext on any user gesture.
['touchstart','click','keydown'].forEach(ev=>addEventListener(ev,()=>{try{Audio_.init()}catch(e){}},{passive:true}));
