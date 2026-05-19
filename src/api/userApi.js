import axios from "axios";
import BASE_URL from "../config"; // adjust path if needed

const API = axios.create({
  baseURL: BASE_URL,
});

// 🔑 Helper
const getToken = async () => {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  return await AsyncStorage.getItem("auth_access_token"); // ✅ fixed key
};

// ✅ FETCH PROFILE
export const fetchProfile = async () => {
  const token = await getToken();

  const response = await API.get("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export default API;