// ─── Dynamic Base URL ─────────────────────────────────────────────────────────
// Set your machine's local IP here (NOT 127.0.0.1 / localhost).
// When running on a physical device, use your WiFi IP (e.g. 192.168.1.x).
// When running on an emulator you can also use 10.0.2.2 (Android AVD).
const BASE_URL = __DEV__
  ? "http://192.168.1.6:8000"   // for local testing
  : "https://universe-mainbackend.onrender.com"; // for APK

export default BASE_URL;