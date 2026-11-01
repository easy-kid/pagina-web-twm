/* eslint-disable react-refresh/only-export-components */
/**
 * =============================================================================
 * CONTEXTO DE AUTENTICACIÓN (AuthContext)
 * =============================================================================
 * Provee el estado global de la sesión del usuario a toda la aplicación.
 * 
 * Conceptos clave:
 * - `AuthProvider`: Componente envolvente (wrapper) que almacena el estado global.
 * - `useAuth()`: Custom Hook para consumir el contexto en cualquier componente.
 * - `token`: Almacena el JWT / access_token de OAuth2 en memoria y en `localStorage`.
 * - `isAuthenticated`: Booleano derivado de la presencia válida del token.
 * 
 * Flujo con FastAPI (OAuth2PasswordRequestForm):
 * FastAPI espera recibir las credenciales en formato `application/x-www-form-urlencoded`
 * en la ruta `/token`. Por eso se utiliza `new URLSearchParams()`.
 */

import { createContext, useContext, useState } from 'react'
import client from '../api/client'

// Creación del objeto Context con valor inicial nulo
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  /**
   * Inicialización perezosa (lazy initial state):
   * La función dentro de useState se ejecuta SOLO en el primer renderizado.
   * Evita consultar repetidamente el almacenamiento síncrono `localStorage`.
   */
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('access_token')
    } catch (err) {
      console.error('Error accediendo a localStorage:', err)
      return null
    }
  })

  // Booleano reactivo que indica si hay un token persistido
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(localStorage.getItem('access_token'))
    } catch {
      return false
    }
  })

  const [loading, setLoading] = useState(false)

  /**
   * login(username, password):
   * 1. Codifica los parámetros en x-www-form-urlencoded para cumplir la especificación OAuth2.
   * 2. Envía la petición POST al endpoint '/token'.
   * 3. Extrae el `access_token` de la respuesta del servidor.
   * 4. Persiste el token en `localStorage` y actualiza el estado reactivo.
   */
  const login = async (username, password) => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)

    const response = await client.post('/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const { access_token } = response.data
    localStorage.setItem('access_token', access_token)
    setToken(access_token)
    setIsAuthenticated(true)

    return response.data
  }

  /**
   * logout():
   * Destruye la sesión local:
   * 1. Remueve el token de `localStorage`.
   * 2. Limpia el estado de `token` e `isAuthenticated` a false.
   */
  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        setLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth():
 * Hook de utilidad para consumir el contexto fácilmente.
 * Lanza un error amigable si se intenta invocar fuera del árbol de <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }
  return context
}
