// Vitals providers: Shen.AI face scan (real) or a labelled demo.
//
// The app talks to providers only through this interface:
//   provider.mode                         'shen' | 'demo'
//   provider.canCalibrate / canReadBpPhoto booleans
//   provider.needsDownload()              true if the SDK has not been downloaded yet
//   await provider.scan(container, onProgress, { userId, onStatus })
//        -> { heartRate, systolic, diastolic, hrv, breathingRate, signalQuality, bpExpectedErrorMmHg, demo, source }
//   await provider.calibrate({ systolic, diastolic, heartRate })  (cuff reading → better face BP)
//   await provider.readBpPhoto(file)      -> { systolic, diastolic, heartRate } from a photo of a BP machine screen
//   provider.stop()
//
// Shen.AI Web SDK (npm: @shenai/sdk, v3.2). API used here, as published in the
// package's index.d.ts and Shen's official examples (github.com/mxlaboratories/shenai-sdk):
//   CreateShenaiSDK(args) -> Promise<sdk>
//   sdk.initialize(apiKeyOrToken, userId, settings, onResult)
//   sdk.setOperatingMode / setCameraMode / getMeasurementState / getMeasurementProgressPercentage
//   sdk.getMeasurementResults / submitCalibrationReading / readBpMonitorPhoto
// The SDK is proprietary: it is NOT committed to this repo. `npm run shen:install`
// fetches it and server.js serves it from node_modules (see README).

const CONFIG = (typeof window !== 'undefined' && window.PEPTISAFE_CONFIG) || {};
const DOWNLOADED_FLAG = 'peptisafe.shenDownloaded';
export const SHEN_DOWNLOAD_MB = '35–40';

export async function createVitalsProvider() {
  if (!CONFIG.shenSdkUrl || !CONFIG.shenTokenUrl) return new DemoProvider('Face scan not configured.');
  try {
    // Both the self-hosted SDK and the token endpoint must be there; otherwise stay in demo mode.
    const [sdk, tok] = await Promise.all([
      fetch(CONFIG.shenSdkUrl, { method: 'HEAD' }),
      fetch(CONFIG.shenTokenUrl, { method: 'HEAD' }),
    ]);
    if (sdk.ok && tok.ok) return new ShenProvider(CONFIG);
    return new DemoProvider(!sdk.ok ? 'Shen.AI SDK not installed on the server.' : 'No Shen.AI licence key on the server.');
  } catch {
    return new DemoProvider('Offline: face scan needs a connection the first time.');
  }
}

// ---------------------------------------------------------------- Shen.AI

class ShenProvider {
  constructor(config) {
    this.mode = 'shen';
    this.canCalibrate = true;
    this.canReadBpPhoto = true;
    this.config = config;
    this.sdk = null;
    this.ready = null; // promise of an initialised SDK
    this.poll = null;
  }

  needsDownload() {
    try { return !localStorage.getItem(DOWNLOADED_FLAG); } catch { return true; }
  }

  async load(userId, onStatus) {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      // Shen.AI's Web SDK needs WebGL 2 and WebAssembly; many budget phones lack the power.
      if (!document.createElement('canvas').getContext('webgl2') || typeof WebAssembly !== 'object') {
        throw new Error('This phone cannot run the face scan. Use a blood pressure machine instead (most pharmacies have one).');
      }
      if (navigator.deviceMemory && navigator.deviceMemory < 3) {
        onStatus?.('This phone has little memory, so the scan may be slow or fail.');
      }
      onStatus?.('Downloading face-scan engine…');
      const { default: CreateShenaiSDK } = await import(/* @vite-ignore */ new URL(this.config.shenSdkUrl, location.href).href);
      const sdk = await CreateShenaiSDK({
        enableErrorReporting: false,
        onWasmLoadingProgress: (p) => onStatus?.(`Downloading face-scan engine… ${Math.round(p * (p <= 1 ? 100 : 1))}%`),
      });
      try { localStorage.setItem(DOWNLOADED_FLAG, '1'); } catch { /* ignore */ }

      onStatus?.('Activating licence…');
      const res = await fetch(this.config.shenTokenUrl, { method: 'POST' });
      if (!res.ok) throw new Error('Could not get a face-scan licence from the server.');
      const { token } = await res.json();

      await new Promise((resolve, reject) => {
        sdk.initialize(token, userId || '', {
          // 60 s gives the most reliable blood pressure; 30 s is quicker.
          measurementPreset: this.config.shenPreset === '30s'
            ? sdk.MeasurementPreset.THIRTY_SECONDS_ALL_METRICS
            : sdk.MeasurementPreset.ONE_MINUTE_ALL_METRICS,
          cameraMode: sdk.CameraMode.FACING_USER,
          precisionMode: sdk.PrecisionMode.STRICT,
          showUserInterface: true,          // Shen's own face-positioning guidance
          showFacePositioningOverlay: true,
          showVisualWarnings: true,
          showStartStopButton: false,       // we start it ourselves
          enableSummaryScreen: false,       // we show results in our own safety view
          enableHealthRisks: false,
          enableStartAfterSuccess: false,
          showDisclaimer: true,
          language: 'en',
          eventCallback: (event) => this.onEvent?.(event),
          onCameraError: () => this.onCameraError?.(),
        }, (result) => {
          if (result === sdk.InitializationResult.OK) return resolve();
          const why = result === sdk.InitializationResult.INVALID_API_KEY ? 'licence key rejected (check it is a Web key)'
            : result === sdk.InitializationResult.CONNECTION_ERROR ? 'no connection to Shen.AI'
            : 'internal error';
          reject(new Error(`Face scan could not start: ${why}.`));
        });
      });
      this.sdk = sdk;
      return sdk;
    })();
    this.ready.catch(() => { this.ready = null; }); // allow retry after a failure
    return this.ready;
  }

  async scan(container, onProgress = () => {}, { userId, onStatus } = {}) {
    container.innerHTML = '<canvas id="mxcanvas" class="scan-canvas"></canvas>';
    const sdk = await this.load(userId, onStatus);
    sdk.attachToCanvas('#mxcanvas');
    sdk.setCameraMode(sdk.CameraMode.FACING_USER);
    sdk.resetMeasurementSession?.();
    onStatus?.('Look at the camera and keep still.');

    return new Promise((resolve, reject) => {
      const S = sdk.MeasurementState;
      const finish = (fn) => { clearInterval(this.poll); this.poll = null; this.onEvent = null; this.onCameraError = null; fn(); };
      const done = () => finish(() => {
        const r = sdk.getMeasurementResults();
        sdk.setOperatingMode(sdk.OperatingMode.POSITIONING);
        sdk.setCameraMode(sdk.CameraMode.OFF);
        if (!r) return reject(new Error('The scan did not produce a result. Try again in better light.'));
        resolve(mapResults(r));
      });
      this.onEvent = (e) => { if (e === 'MEASUREMENT_FINISHED') done(); };
      this.onCameraError = () => finish(() => reject(new Error('Camera not available. Allow camera access and try again.')));

      sdk.setOperatingMode(sdk.OperatingMode.MEASURE);
      this.poll = setInterval(() => {
        const st = sdk.getMeasurementState();
        onProgress(Math.min(1, (sdk.getMeasurementProgressPercentage() || 0) / 100));
        if (st === S.WAITING_FOR_FACE) onStatus?.('Put your face inside the outline.');
        else if (st === S.RUNNING_SIGNAL_BAD) onStatus?.('Signal weak: face a window or a lamp, and keep still.');
        else if (st === S.RUNNING_SIGNAL_BAD_DEVICE_UNSTABLE) onStatus?.('Rest the phone on something so it does not move.');
        else if (st === S.RUNNING_SIGNAL_GOOD || st === S.RUNNING_SIGNAL_SHORT) onStatus?.('Measuring… keep still.');
        else if (st === S.FINALIZING) onStatus?.('Almost done…');
        else if (st === S.FINISHED) done();
        else if (st === S.FAILED) finish(() => reject(new Error('The scan failed. Try again in better light, holding still.')));
      }, 500);
    });
  }

  // A cuff reading taken right after a face scan teaches Shen.AI this person's BP offset.
  async calibrate({ systolic, diastolic, heartRate }) {
    if (!this.sdk) return false;
    return this.sdk.submitCalibrationReading({ systolicMmhg: systolic, diastolicMmhg: diastolic, ...(heartRate ? { pulseBpm: heartRate } : {}) });
  }

  // Read the numbers off a photo of a blood pressure machine's screen.
  async readBpPhoto(file, { userId, onStatus } = {}) {
    const sdk = await this.load(userId, onStatus);
    const r = await sdk.readBpMonitorPhoto(file);
    if (typeof r === 'string') {
      const msg = { 'values-not-found': 'Could not find the numbers. Take the photo straight on, without glare.',
        'invalid-image': 'That photo could not be read.', 'service-unavailable': 'The reading service is not available right now.' }[r];
      throw new Error(msg || `Could not read the machine (${r}). Type the numbers in instead.`);
    }
    return { systolic: r.systolicMmhg, diastolic: r.diastolicMmhg, heartRate: r.pulseBpm ?? null };
  }

  stop() {
    if (this.poll) { clearInterval(this.poll); this.poll = null; }
    if (this.sdk) {
      try { this.sdk.setOperatingMode(this.sdk.OperatingMode.POSITIONING); this.sdk.setCameraMode(this.sdk.CameraMode.OFF); } catch { /* ignore */ }
    }
  }
}

export function mapResults(r) {
  const q = r.quality_metrics || {};
  const round = (x) => (x == null ? null : Math.round(x));
  return {
    heartRate: round(r.heart_rate_bpm),
    systolic: round(r.systolic_blood_pressure_mmhg),
    diastolic: round(r.diastolic_blood_pressure_mmhg),
    hrv: round(r.hrv_sdnn_ms),
    breathingRate: round(r.breathing_rate_bpm),
    signalQuality: r.average_signal_quality ?? null,
    bpExpectedErrorMmHg: q.expected_sbp_mean_abs_error_mmHg != null ? Math.round(q.expected_sbp_mean_abs_error_mmHg) : null,
    demo: false,
    source: 'shen',
  };
}

// ---------------------------------------------------------------- Demo

class DemoProvider {
  constructor(reason) {
    this.mode = 'demo';
    this.reason = reason;
    this.canCalibrate = false;
    this.canReadBpPhoto = false;
    this.stream = null;
    this.timer = null;
  }

  needsDownload() { return false; }

  async scan(container, onProgress = () => {}, { onStatus } = {}) {
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
    onStatus?.('Demo scan: keep still.');
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
    return { heartRate: r(62, 88), systolic: r(112, 136), diastolic: r(70, 86), hrv: r(25, 60), breathingRate: r(12, 18), demo: true, source: 'shen' };
  }

  async calibrate() { return false; }
  async readBpPhoto() { throw new Error('Reading a BP machine photo needs the Shen.AI SDK.'); }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
