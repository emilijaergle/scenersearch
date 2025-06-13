/* ---------- ESM imports (+esm) ---------- */
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat
} from 'https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm';

/* ---------- UI elementi ---------- */
const input   = document.getElementById('searchInput');
const video   = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx     = overlay.getContext('2d', { willReadFrequently: true });
const beep    = document.getElementById('beep');
let searchCode = '';

input.addEventListener('input', () => searchCode = input.value.trim());

/* ---------- ZXing hints Map ---------- */
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,   BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,    BarcodeFormat.UPC_E
]);

/* ---------- Reader (hints, delay) ---------- */
const reader = new BrowserMultiFormatReader(hints, 150);

/* ---------- Kamera startēšana ---------- */
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

  fitCanvas();
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const { text: code, resultPoints: pts } = result;
  const poly = pts.map(({x,y}) => scale(x,y));

  const col = pickColor(code);
  drawPoly(poly, col); drawLabel(code, poly[0], col);
  if (col === '--green') beep.play();
}
/* ====================================================== */

/* ---------- Palīgfunkcijas ---------- */
function fitCanvas(){
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
  ctx.lineWidth   = cssVar==='--red'?2:4;
  ctx.strokeStyle = getColor(cssVar); ctx.stroke();
}
function drawLabel(txt,[x,y],cssVar){
  ctx.font='16px Arial'; ctx.fillStyle='#fff';
  ctx.fillText(txt,x,y-6);
}
function pickColor(code){
  if (!searchCode)           return '--blue';
  if (code === searchCode)   return '--green';
  return levenshtein(code,searchCode)<=3 ? '--orange' : '--red';
}
function getColor(v){
  return getComputedStyle(document.documentElement).getPropertyValue(v);
}

/* <=3 atšķirību Levenshtein */
function levenshtein(a,b){
  if(Math.abs(a.length-b.length)>3) return 4;
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
function showMsg(t){
  let el=document.getElementById('msg');
  if(!el){
    el=document.createElement('div');el.id='msg';
    Object.assign(el.style,{position:'fixed',bottom:'8px',left:'50%',
      transform:'translateX(-50%)',fontSize:'14px',color:'#ffb'});
    document.body.append(el);
  }
  el.textContent=t;
}
