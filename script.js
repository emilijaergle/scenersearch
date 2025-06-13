/* --------------- ES-module import no JSDelivr “+esm” --------------- */
import {
  BrowserMultiFormatReader,
  BarcodeFormat
} from 'https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm';

/* ---- elementi ---- */
const input   = document.getElementById('searchInput');
const video   = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx     = overlay.getContext('2d', { willReadFrequently: true });
const beep    = document.getElementById('beep');
let searchCode = '';

input.addEventListener('input', () => searchCode = input.value.trim());

/* ---- ZXing reader ---- */
const reader = new BrowserMultiFormatReader({
  delayBetweenScanAttempts: 150,
  hints: new Map([[BarcodeFormat.CODE_128,true],[BarcodeFormat.CODE_39,true],
                  [BarcodeFormat.EAN_13,true],[BarcodeFormat.EAN_8,true],
                  [BarcodeFormat.UPC_A,true],[BarcodeFormat.UPC_E,true]])
});

(async () => {
  try {
    const cams = await BrowserMultiFormatReader.listVideoInputDevices();
    const camId = cams[0]?.deviceId;
    if (!camId) { showMsg('⚠️ Kamera nav atrasta'); return; }

    await reader.decodeFromVideoDevice(camId, video, onDetect);
  } catch (e) {
    console.error(e); showMsg('❌ Kamera bloķēta vai nepieejama');
  }
})();

/* ====================================================== */
function onDetect(result) {
  if (!result) return;

  resizeCanvas(); ctx.clearRect(0,0,overlay.width,overlay.height);

  const { text:code, resultPoints:pts } = result;
  const poly = pts.map(({x,y}) => scale(x,y));

  const col = pickColor(code);
  drawPoly(poly, col); drawLabel(code, poly[0], col);

  if (col === '--green') beep.play();
}
/* ====================================================== */

function resizeCanvas(){
  overlay.width  = overlay.clientWidth;
  overlay.height = overlay.clientHeight;
}
function scale(x,y){
  return [
    x * overlay.width  / video.videoWidth,
    y * overlay.height / video.videoHeight
  ];
}
function drawPoly(pts, cssVar){
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p=>ctx.lineTo(...p)); ctx.closePath();
  ctx.lineWidth = cssVar==='--red'?2:4;
  ctx.strokeStyle = getColor(cssVar); ctx.stroke();
}
function drawLabel(txt,[x,y],cssVar){
  ctx.font='16px Arial'; ctx.fillStyle='#fff';
  ctx.fillText(txt,x,y-6);
}
function pickColor(code){
  if (!searchCode)           return '--blue';
  if (code === searchCode)   return '--green';
  return levenshtein(code,searchCode)<=3?'--orange':'--red';
}
function getColor(v){ return getComputedStyle(document.documentElement)
                       .getPropertyValue(v); }
/* ≤3 atšķirības */
function levenshtein(a,b){
  if(Math.abs(a.length-b.length)>3) return 4;
  const m=a.length,n=b.length,d=[...Array(n+1).keys()];
  for(let i=1,prev,tmp;i<=m;i++){
    tmp=d[0]++; for(let j=1;j<=n;j++){
      prev=d[j]; d[j]=Math.min(d[j]+1,d[j-1]+1,tmp+(a[i-1]!==b[j-1]));
      tmp=prev;
    }
  } return d[n];
}
function showMsg(t){
  let el=document.getElementById('msg');
  if(!el){el=document.createElement('div');el.id='msg';
          el.style.position='fixed';el.style.bottom='8px';
          el.style.left='50%';el.style.transform='translateX(-50%)';
          el.style.fontSize='14px';el.style.color='#ffb';document.body.append(el);}
  el.textContent=t;
}
