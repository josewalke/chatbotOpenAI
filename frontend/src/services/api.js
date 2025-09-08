// Configuración de axios para el frontend
import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://tu-dominio.com/api' 
    : 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
