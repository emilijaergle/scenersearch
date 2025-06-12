document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const startBtn = document.getElementById('startBtn');
  const beep = document.getElementById('beep');
  const overlay = document.getElementById('overlay');
  const context = overlay.getContext('2d');
  const videoElement = document.querySelector('video');
  let searchCode = '';

  startBtn.addEventListener('click', () => {
    searchCode = searchInput.value.trim();

    Quagga.init({
      inputStream: {
        type: 'LiveStream',
        constraints: {
          facingMode: 'environment'
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
        ]
      },
      locate: true,
      locator: {
        halfSample: true,
        patchSize: 'medium'
      }
    }, function (err) {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected(data => {
      const code = data.codeResult.code;
      const box = data.box;

      overlay.width = overlay.clientWidth;
      overlay.height = overlay.clientHeight;
      context.clearRect(0, 0, overlay.width, overlay.height);

      if (box && videoElement.videoWidth && videoElement.videoHeight) {
        const scaleX = overlay.width / videoElement.videoWidth;
        const scaleY = overlay.height / videoElement.videoHeight;

        const scaledBox = box.map(([x, y]) => [x * scaleX, y * scaleY]);

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
      }
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
