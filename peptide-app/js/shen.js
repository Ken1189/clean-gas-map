// Shen.AI face-scan adapter.
//
// The app talks to vitals providers only through this small interface:
//   provider.mode                    -> 'demo' | 'shen'
//   await provider.scan(container, onProgress) -> { heartRate, systolic, diastolic, hrv, demo }
//   provider.stop()
//
// DEMO mode (default) opens the camera for a short simulated scan and returns
// plausible values clearly marked demo: true, so the full flow can be tested
// without a Shen.AI licence.
//
// SHEN mode: wire the real Web SDK in `startShen()` below.
//   1. Get a *Web* licence key from the Shen.AI Customer Dashboard (mobile keys
//      will fail with INVALID_API_KEY on web).
//   2. Do not ship the permanent key to browsers: have the backend mint a
//      short-lived token (see developer.shen.ai → Authorization) and pass it in.
//   3. Download the Web SDK from the Customer Portal, self-host it next to this
//      app and follow developer.shen.ai/platforms/web for the init and result
//      calls. The SDK needs cross-origin isolation (COOP/COEP headers), which
//      server.js already sends.
//   4. Map Shen's results onto the object returned by scan(). Keep `demo: false`
//      and `source: 'shen'` so the safety engine knows to ask for cuff
//      confirmation of high blood pressure readings.
// For a native app, use the Shen Flutter / React Native SDK with a *mobile* key.

const CONFIG = (typeof window !== 'undefined' && window.PEPTISAFE_CONFIG) || {};

export function createVitalsProvider() {
  return CONFIG.shenTokenUrl ? new ShenProvider(CONFIG) : new DemoProvider();
}

class DemoProvider {
  constructor() { this.mode = 'demo'; this.stream = null; this.timer = null; }

  async scan(container, onProgress = () => {}) {
    container.innerHTML = '';
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.className = 'scan-video';
    container.appendChild(video);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = this.stream;
      await video.play();
    } catch {
      container.innerHTML = '<div class="scan-nocam">Camera not available. Running demo scan without video.</div>';
    }
    const seconds = 8;
    await new Promise((resolve) => {
      let t = 0;
      this.timer = setInterval(() => {
        t += 0.25;
        onProgress(Math.min(1, t / seconds));
        if (t >= seconds) { clearInterval(this.timer); resolve(); }
      }, 250);
    });
    this.stop();
    const r = (lo, hi) => Math.round(lo + Math.random() * (hi - lo));
    return { heartRate: r(62, 88), systolic: r(112, 136), diastolic: r(70, 86), hrv: r(25, 60), demo: true, source: 'shen' };
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

class ShenProvider {
  constructor(config) { this.mode = 'shen'; this.config = config; }

  async scan(container, onProgress = () => {}) {
    const res = await fetch(this.config.shenTokenUrl, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('Could not get a scan token from the server.');
    const { token } = await res.json();
    return startShen({ token, container, onProgress, sdkUrl: this.config.shenSdkUrl });
  }

  stop() { /* call the SDK's teardown here once wired */ }
}

// eslint-disable-next-line no-unused-vars
async function startShen({ token, container, onProgress, sdkUrl }) {
  // TODO(shen): load the self-hosted Web SDK from sdkUrl, initialise it with
  // `token`, render its camera view into `container`, report progress through
  // onProgress(0..1), wait for the measurement to finish, then return:
  //   { heartRate, systolic, diastolic, hrv, demo: false, source: 'shen' }
  throw new Error('Shen.AI Web SDK is not wired yet. See js/shen.js for the steps.');
}
