import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.1.6:8000', // 🔴 IMPORTANT
});

// ✅ FETCH PROFILE
export const fetchProfile = async () => {
  const token = await getToken(); // or however you store token

  const response = await API.get('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// 🔑 Helper (adjust if needed)
const getToken = async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return await AsyncStorage.getItem('token');
};