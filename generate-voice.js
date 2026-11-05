#!/usr/bin/env node
/* DEV-ONLY helper (not used by the app). Generates prayer-audio.opus + prayer-audio.mp3 and
   prayer-audio.json (exact word timings) with Google Cloud Text-to-Speech.
   Run:  GOOGLE_TTS_API_KEY=your-key node generate-voice.js      (Node 18+)
   Preview the SSML without a key:  node generate-voice.js --dry
   Keep the key on your own computer. Never put it in the PWA or on GitHub. */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'js/audio.js'),'utf8');
const lines=Function('return '+/const PRAYER_SRC=(\{[\s\S]*?\});/.exec(src)[1])().tl; // same Tagalog text the app shows
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const ssml='<speak>'+lines.map((l,k)=>l.split(' ').map((w,n)=>`<mark name="${k}:${n}"/>${esc(w)}`).join(' ')+'<break time="1200ms"/>').join('\n')+'</speak>';
if(process.argv.includes('--dry')){console.log(ssml);process.exit(0)}
const KEY=process.env.GOOGLE_TTS_API_KEY;if(!KEY){console.error('Set GOOGLE_TTS_API_KEY first (or use --dry).');process.exit(1)}
const VOICES=[process.env.VOICE||'fil-PH-Neural2-A','fil-PH-Wavenet-A'];
async function synth(enc,voice,marks){
 const r=await fetch('https://texttospeech.googleapis.com/v1beta1/text:synthesize?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({input:{ssml},voice:{languageCode:'fil-PH',name:voice},audioConfig:{audioEncoding:enc,speakingRate:.88,pitch:-1.5},...(marks?{enableTimePointing:['SSML_MARK']}:{})})});
 const j=await r.json();if(!r.ok)throw new Error((j.error&&j.error.message)||r.status);return j}
(async()=>{let wroteCues=false;
 for(const [enc,ext] of [['OGG_OPUS','opus'],['MP3','mp3']]){let done=false;
  for(const v of VOICES){for(const marks of [true,false]){if(done)break;
   try{const j=await synth(enc,v,marks);fs.writeFileSync(path.join(__dirname,'prayer-audio.'+ext),Buffer.from(j.audioContent,'base64'));
    console.log('wrote prayer-audio.'+ext,'('+v+(marks?', timings':'')+')');done=true;
    if(marks&&j.timepoints&&!wroteCues){fs.writeFileSync(path.join(__dirname,'prayer-audio.json'),JSON.stringify(j.timepoints.map(t=>{const [k,n]=t.markName.split(':');return [+k,+n,+t.timeSeconds]})));
     console.log('wrote prayer-audio.json');wroteCues=true}}
   catch(e){console.warn(enc,v,marks?'(with timings)':'','->',e.message)}}}
  if(!done)process.exitCode=1}
 console.log('Done. Copy nothing: files are already in the project root. Bump the cache version in sw.js if the app is already deployed.')})();
