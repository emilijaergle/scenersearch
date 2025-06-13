document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const startBtn = document.getElementById('startBtn');
  const beep = document.getElementById('beep');
  const overlay = document.getElementById('overlay');
  const context = overlay.getContext('2d', { willReadFrequently: true });
  const videoElement = document.querySelector('video');
  let searchCode = '';

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
      console.log("DETECTED:", result);
      overlay.width = overlay.clientWidth;
      overlay.height = overlay.clientHeight;
      context.clearRect(0, 0, overlay.width, overlay.height);

      const boxes = result.boxes || [];

      boxes.forEach(boxData => {
        const box = boxData.box || boxData;
        const code = boxData.codeResult?.code;

        if (!box || !Array.isArray(box) || box.length < 4) return;

        const scaleX = overlay.width / videoElement.videoWidth;
        const scaleY = overlay.height / videoElement.videoHeight;
        const scaledBox = box.map(([x, y]) => [x * scaleX, y * scaleY]);

        context.lineWidth = 2;
        context.strokeStyle = 'red';
        context.beginPath();
        context.moveTo(scaledBox[0][0], scaledBox[0][1]);
        for (let i = 1; i < scaledBox.length; i++) {
          context.lineTo(scaledBox[i][0], scaledBox[i][1]);
        }
        context.closePath();
        context.stroke();

        if (!code) return;

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
