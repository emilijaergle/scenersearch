document.addEventListener('DOMContentLoaded', () => {
  const input   = document.getElementById('searchInput');
  const beep    = document.getElementById('beep');
  const video   = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  const ctx     = overlay.getContext('2d', { willReadFrequently: true });

  let searchCode = '';

  input.addEventListener('input', () => { searchCode = input.value.trim(); });

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: document.querySelector('#videoWrapper'),
      constraints: {
        facingMode: 'environment',
        width : { ideal: 1280 },
        height: { ideal: 720 }
      }
    },
    decoder: {
      readers: [
        'code_128_reader',
        'ean_reader',
        'ean_8_reader',
        'upc_reader',
        'code_39_reader'
      ],
      multiple: true
    },
    locate: true,
    locator: {
      halfSample: false,
      patchSize: 'x-small'
    },
    frequency: 15
  }, err => {
    if (err) { console.error(err); return; }

    video.onloadedmetadata = () => Quagga.start();
  });

  Quagga.onProcessed(result => {
    if (!result || !result.boxes) return;

    fitCanvas();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    result.boxes.forEach(box => drawBox(box, 'red'));
  });

  Quagga.onDetected(res => {
    res?.codeResult && highlightMatch(res);
  });


  function fitCanvas() {
    overlay.width  = overlay.clientWidth;
    overlay.height = overlay.clientHeight;
  }

  function drawBox(box, color) {
    if (!box || !Array.isArray(box) || box.length < 4) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const scaleX = overlay.width  / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;
    const pts = box.map(([x, y]) => [x * scaleX, y * scaleY]);

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.lineWidth   = color === 'red' ? 2 : 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    return pts[0];
  }

  function highlightMatch(res) {
    const { code } = res.codeResult;
    const topLeft  = drawBox(res.box, matchColor(code));
    if (!topLeft) return;

    ctx.font      = '16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(code, topLeft[0], topLeft[1] - 6);
  }

  function matchColor(code) {
    if (!searchCode)          return 'blue'; 
    if (code === searchCode)  { beep.play(); return 'lime'; }
    return isSimilar(code, searchCode) ? 'orange' : 'red';
  }

  function isSimilar(a, b) {
    if (Math.abs(a.length - b.length) > 3) return false;
    let dpPrev = Array(b.length + 1).fill(0).map((_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const dpCurr = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dpCurr[j] = Math.min(
          dpPrev[j] + 1,        
          dpCurr[j - 1] + 1,     
          dpPrev[j - 1] + cost    
        );
      }
      dpPrev = dpCurr;
    }
    return dpPrev[b.length] <= 3;
  }
});
