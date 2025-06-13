import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";

/* ---- elementi ---- */
const input   = document.getElementById("searchInput");
const video   = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx     = overlay.getContext("2d", { willReadFrequently: true });
const beep    = document.getElementById("beep");
const msg     = document.getElementById("msg");
let searchCode = "";

/* ---- konfigurācija ---- */
const reader = new BrowserMultiFormatReader({
  delayBetweenScanAttempts: 150,          // ~6 fps skenēšana
  hints: new Map([
    [BarcodeFormat.CODE_128, true], [BarcodeFormat.CODE_39, true],
    [BarcodeFormat.EAN_13, true],  [BarcodeFormat.EAN_8,  true],
    [BarcodeFormat.UPC_A, true],    [BarcodeFormat.UPC_E, true]
  ])
});

/* ---- startē kameru ---- */
(async () => {
  try {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    const camId   = devices[0]?.deviceId;
    if (!camId) { showMsg("⚠️ Kamera nav atrasta"); return; }

    await reader.decodeFromVideoDevice(camId, video, onDetect);
  } catch (e) {
    showMsg("❌ Kamera bloķēta / nav pieejama"); console.error(e);
  }
})();

/* ---- meklējuma lauks ---- */
input.addEventListener("input", () => searchCode = input.value.trim());

/* ======================================================= */
/* ----------------  DETEKCIJAS FUNKCIJA  ---------------- */
function onDetect(result, err, controls) {
  if (err || !result) { return; }      // šoreiz bez kļūdas ziņas

  resizeCanvas();
  ctx.clearRect(0,0,overlay.width,overlay.height);

  // ZXing atgriež tikai vienu kodu reizē, toties precīzu
  const { text: code, resultPoints: pts } = result;

  // zīmē kontūru
  const poly = pts.map(({x,y}) => scale(x,y));
  drawPoly(poly, pickColor(code), code);
}
/* ======================================================= */

function resizeCanvas() {
  overlay.width  = overlay.clientWidth;
  overlay.height = overlay.clientHeight;
}

function scale(x,y){
  return [
    x * overlay.width  / video.videoWidth,
    y * overlay.height / video.videoHeight
  ];
}

function drawPoly(pts, color, label) {
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p=>ctx.lineTo(...p)); ctx.closePath();
  ctx.lineWidth = color==='var(--red)'?2:4;
  ctx.strokeStyle = getColor(color); ctx.stroke();

  // teksts
  const [x,y]=pts[0];
  ctx.font='16px Arial'; ctx.fillStyle='#fff';
  ctx.fillText(label,x,y-6);
}

function pickColor(code){
  if (!searchCode)        return getColor('--blue');
  if (code === searchCode){ beep.play(); return getColor('--green'); }
  return levenshtein(code,searchCode)<=3?getColor('--orange'):getColor('--red');
}

function getColor(cssVar){ return getComputedStyle(document.documentElement)
                            .getPropertyValue(cssVar||cssVar); }

/* ----- Levenshtein <=3 ---- */
function levenshtein(a,b){
  if(Math.abs(a.length-b.length)>3)return 4;
  const m=a.length,n=b.length;
  let dp=Array(n+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=m;i++){
    let prev=i,tmp; dp[0]=i;
    for(let j=1;j<=n;j++){
      tmp=dp[j];
      dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
      prev=tmp;
    }
  }
  return dp[n];
}

function showMsg(t){msg.textContent=t;}
