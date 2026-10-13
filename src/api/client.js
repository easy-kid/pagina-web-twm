import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://ulamonitors-uat-back.grye.org'

const client = axios.create({
  baseURL: API_URL,
})

// Interceptor de Petición (Request): Agrega token si existe
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de Respuesta (Response): Manejo de 401 Unauthorized
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
