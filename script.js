document.addEventListener('DOMContentLoaded', () => {

  /* ---- elementi ---- */
  const input   = document.getElementById('searchInput');
  const video   = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  const ctx     = overlay.getContext('2d', { willReadFrequently: true });
  const beep    = document.getElementById('beep');
  let searchCode = '';

  input.addEventListener('input', () => searchCode = input.value.trim());

  /* ---- Quagga konfigurācija ---- */
  const cfg = {
    inputStream: {
      type: 'LiveStream',
      target: document.querySelector('#videoWrapper'),
      constraints: {
        width : { ideal: 1920, max: 1920 },   // desktop HD
        height: { ideal: 1080, max: 1080 },
        facingMode: { ideal: 'environment' }  // mobile back-cam, desktop ignorē
      }
    },
    decoder: {
      multiple: true,
      readers: [
        'code_128_reader', 'ean_reader', 'ean_8_reader',
        'upc_reader', 'code_39_reader'
      ]
    },
    locate: true,
    locator: {
      halfSample: false,       // pilna izšķirtspēja
      patchSize: 'small'       // x-small var būt lēns uz desktop
    },
    frequency: 25              // vairāk kadru sekundē
  };

  Quagga.init(cfg, err => {
    if (err) { console.error(err); return; }
    /* startēt pēc tam, kad video patiešām gatavs */
    video.onloadedmetadata = () => Quagga.start();
  });

  /* ---- zīmēšana VISIEM (sarkans) ---- */
  Quagga.onProcessed(res => {
    if (!res || !res.boxes) return;

    resizeCanvas();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    res.boxes.forEach(b => drawBox(b, '--red', 2));   // sarkanie
  });

  /* ---- dekodētie (zaļš/oranžš/zils) ---- */
  Quagga.onDetected(res => {
    const { code } = res.codeResult || {};
    if (!code) return;

    const color = pickColor(code);
    const p     = drawBox(res.box, color, 4);
    if (p) drawLabel(code, p, color);

    if (color === '--green') beep.play();
  });

  /* ========================================================= */

  function resizeCanvas() {
    overlay.width  = overlay.clientWidth;
    overlay.height = overlay.clientHeight;
  }

  function scale(pt){                 // X,Y skalēšana
    return [
      pt[0] * overlay.width  / video.videoWidth,
      pt[1] * overlay.height / video.videoHeight
    ];
  }

  /* zīmē taisnstūri, atgriež pirmo punktu teksta izvietojumam */
  function drawBox(box, cssColorVar, w = 2){
    if (!box || !Array.isArray(box) || box.length < 4 ||
        !video.videoWidth || !video.videoHeight) return null;

    const pts = box.map(scale);
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    pts.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.closePath();
    ctx.lineWidth   = w;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(cssColorVar);
    ctx.stroke();
    return pts[0];
  }

  function drawLabel(txt,[x,y],cssColorVar){
    ctx.font='16px Arial';
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue(cssColorVar);
    ctx.fillText(txt,x,y-6);
  }

  function pickColor(code){
    if (!searchCode)             return '--blue';   // brīvs skenējums
    if (code === searchCode)     return '--green';
    return isSimilar(code,searchCode)?'--orange':'--red';
  }

  /* ≤3 atšķirības Levenshtein distance */
  function isSimilar(a,b){
    if (Math.abs(a.length-b.length)>3) return false;
    const m=a.length,n=b.length; const d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);
    for(let j=1;j<=n;j++)d[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);
    }
    return d[m][n]<=3;
  }
});
