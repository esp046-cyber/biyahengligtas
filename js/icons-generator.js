/* Renders the cross/compass icon to canvas at any size; sets apple-touch-icon (180) at runtime.
   Call IconGen.download() in the console to save every PNG size + maskable. */
const IconGen={sizes:[72,96,128,144,152,180,192,384,512],
 draw(s,maskable){const c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');
  x.fillStyle='#0f2a43';x.fillRect(0,0,s,s);const r=s*(maskable?.28:.38),m=s/2;
  x.strokeStyle='#f0b64a';x.lineWidth=s*.04;x.lineCap='round';x.beginPath();x.arc(m,m,r,0,7);x.stroke();
  x.beginPath();x.moveTo(m,m-r*.75);x.lineTo(m,m+r*.75);x.moveTo(m-r*.75,m);x.lineTo(m+r*.75,m);x.stroke();return c},
 url(s,mk){return this.draw(s,mk).toDataURL('image/png')},
 download(){this.sizes.forEach(s=>{const a=document.createElement('a');a.href=this.url(s);a.download=`icon-${s}.png`;a.click()});
  const a=document.createElement('a');a.href=this.url(512,true);a.download='icon-maskable-512.png';a.click()}};
document.getElementById('touchIcon').href=IconGen.url(180);
