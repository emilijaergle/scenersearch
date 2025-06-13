/* --- 1) pārlūka wrapper --- */
import { BrowserMultiFormatReader } from
  'https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm';

/* --- 2) pamatbibliotēka (enumi) --- */
import {
  DecodeHintType,
  BarcodeFormat
} from 'https://cdn.jsdelivr.net/npm/@zxing/library@latest/+esm';

/* ------ elementi ------ */
const input   = document.getElementById('searchInput');
const video   = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx     = overlay.getContext('2d', { willReadFrequently: true });
const beep    = document.getElementById('beep');
let searchCode = '';

input.addEventListener('input', () => searchCode = input.value.trim());

/* ------ Hints (tagad no @zxing/library) ------ */
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E
]);

/* ------ Reader ------ */
const reader = new BrowserMultiFormatReader(hints, 150);

/* ------ Kamera ------ */
(async () => {
  try {
    const cams = await BrowserMultiFormatReader.listVideoInputDevices();
    const cam = cams[0];
    if (!cam) { showMsg('⚠️ Kamera nav atrasta'); return; }

    await reader.decodeFromVideoDevice(cam.deviceId, video, onDetect);
  } catch (e) {
    console.error(e); showMsg('❌ Kamera bloķēta vai nav pieejama');
  }
})();

/* =================================================== */
function onDetect(result) {
  if (!result) return;

  adjustCanvas();
  ctx.clearRect(0,0,overlay.width,overlay.height);

  const { text: code, resultPoints: pts } = result;
  const poly = pts.map(({x,y}) => scale(x,y));

  const col = chooseColor(code);
  drawPoly(poly, col); drawLabel(code, poly[0], col);
  if (col === '--green') beep.play();
}
/* =================================================== */

/* -- util -- */
function adjustCanvas(){ overlay.width=overlay.clientWidth;
                         overlay.height=overlay.clientHeight; }
function scale(x,y){ return [
  x*overlay.width/video.videoWidth,
  y*overlay.height/video.videoHeight
];}
function drawPoly(pts,c){ ctx.beginPath(); ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p=>ctx.lineTo(...p)); ctx.closePath();
  ctx.lineWidth=c==='--red'?2:4; ctx.strokeStyle=color(c); ctx.stroke();}
function drawLabel(t,[x,y],c){ ctx.font='16px Arial'; ctx.fillStyle='#fff';
                               ctx.fillText(t,x,y-6); }
function chooseColor(code){
  if(!searchCode)          return '--blue';
  if(code===searchCode)    return '--green';
  return lev(code,searchCode)<=3 ? '--orange' : '--red';
}
function color(v){return getComputedStyle(document.documentElement)
                  .getPropertyValue(v);}
function showMsg(t){
  let el=document.getElementById('msg');
  if(!el){el=document.createElement('div');el.id='msg';
    Object.assign(el.style,{position:'fixed',bottom:'8px',left:'50%',
      transform:'translateX(-50%)',fontSize:'14px',color:'#ffb'});document.body.append(el);}
  el.textContent=t;
}
/* Levenshtein ≤3 */
function lev(a,b){
  if(Math.abs(a.length-b.length)>3)return 4;
  const n=b.length,d=[...Array(n+1).keys()];
  for(let i=1,prev;i<=a.length;i++){
    prev=d[0]++; let tmp;
    for(let j=1;j<=n;j++){
      tmp=d[j];
      d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]!==b[j-1]));
      prev=tmp;
    }
  } return d[n];
}
