import { Platform } from "react-native";
import Constants from "expo-constants";

// ─── Backend URLs ─────────────────────────────────────────────────────────────
const LOCAL_IP      = "10.156.42.116";           // your machine's LAN IP
const LOCAL_URL     = `http://${LOCAL_IP}:8000`;
const PRODUCTION_URL = "https://universe-mainbackend.onrender.com";

// ─── Switch ───────────────────────────────────────────────────────────────────
// Set USE_LOCAL to true ONLY when you are running the FastAPI server locally
// AND your phone is on the same WiFi network.
// For all Expo Go testing against the deployed Render backend, keep it false.
const USE_LOCAL = false;

const BASE_URL = USE_LOCAL ? LOCAL_URL : PRODUCTION_URL;

export default BASE_URL;