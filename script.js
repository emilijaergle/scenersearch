// ✅ script.js ar uzlabojumiem mobilajiem un augstas kvalitātes detektēšanu

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const startBtn = document.getElementById('startBtn');
  const beep = document.getElementById('beep');
  const overlay = document.getElementById('overlay');
  const context = overlay.getContext('2d');
  const videoElement = document.querySelector('video');
  let searchCode = '';

  // Mobilajā neļauj soft-klaviatūrai pazudināt UI
  searchInput.addEventListener('focus', () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  });

  startBtn.addEventListener('click', () => {
    searchCode = searchInput.value.trim();

    Quagga.init({
      inputStream: {
        name: "Live",
        type: 'LiveStream',
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        area: {
          top: "0%",
          right: "0%",
          left: "0%",
          bottom: "0%"
        },
        target: document.querySelector('#videoWrapper')
      },
      decoder: {
        readers: [
          'code_128_reader',
          'ean_reader',
          'ean_8_reader',
          'upc_reader'
        ],
        multiple: true
      },
      locate: true,
      locator: {
        halfSample: false,
        patchSize: 'x-small'
      },
      frequency: 10
    }, function (err) {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected(result => {
      const codes = Array.isArray(result.codeResult) ? result.codeResult : [result.codeResult];
      overlay.width = overlay.clientWidth;
      overlay.height = overlay.clientHeight;
      context.clearRect(0, 0, overlay.width, overlay.height);

      const results = result.boxes || [];

      results.forEach((boxData, index) => {
        const box = boxData.box || boxData;
        const code = boxData.codeResult?.code || 'unknown';

        if (!box || !videoElement.videoWidth || !videoElement.videoHeight) return;

        const scaleX = overlay.width / videoElement.videoWidth;
        const scaleY = overlay.height / videoElement.videoHeight;
        const scaledBox = box.map(([x, y]) => [x * scaleX, y * scaleY]);

        // Zīmē sarkanu visiem
        context.lineWidth = 2;
        context.strokeStyle = 'red';
        context.beginPath();
        context.moveTo(scaledBox[0][0], scaledBox[0][1]);
        for (let i = 1; i < scaledBox.length; i++) {
          context.lineTo(scaledBox[i][0], scaledBox[i][1]);
        }
        context.closePath();
        context.stroke();

        // Ja ir meklētais kods – zaļš
        context.lineWidth = 4;
        if (code === searchCode) {
          context.strokeStyle = 'lime';
          beep.play();
        } else if (isSimilar(code, searchCode)) {
          context.strokeStyle = 'orange';
        } else {
          return;
        }

        context.beginPath();
        context.moveTo(scaledBox[0][0], scaledBox[0][1]);
        for (let i = 1; i < scaledBox.length; i++) {
          context.lineTo(scaledBox[i][0], scaledBox[i][1]);
        }
        context.closePath();
        context.stroke();

        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.fillText(code, scaledBox[0][0], scaledBox[0][1] - 10);
      });
    });
  });

  function isSimilar(a, b) {
    let same = 0;
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) {
      if (a[i] === b[i]) same++;
    }
    return same / Math.max(a.length, b.length) >= 0.7;
  }
});
