import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://127.0.0.1:8000/api/v1'; 

const api = axios.create({
  baseURL: API_URL,
});

// Her istekten önce Token var mı diye bak, varsa ekle
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;