import api from './api';

export const sensorService = {
  // Trae todos los sensores del backend
  getSensors: async (params = {}) => {
    const response = await api.get('/sensors', { params });
    return response.data;
  },

  // Trae la información de un sensor en específico por su ID
  getSensorById: async (id) => {
    const response = await api.get(`/sensors/${id}`);
    return response.data;
  },

  // Trae el historial de mediciones para armar el gráfico
  getMeasurements: async (params = {}) => {
    const response = await api.get('/measurements', { params });
    return response.data;
  }
};