/* eslint-disable react-refresh/only-export-components */
/**
 * CONTEXTO GLOBAL DE AUTENTICACIÓN Y SESIÓN (AuthContext.jsx)
 * CONTEXTO GLOBAL DE AUTENTICACIÓN Y SESIÓN (AuthContext.jsx)
 */

import { createContext, useContext, useState } from 'react'
import client from '../api/client'

/**
 * Instancia del Contexto React para la Identidad de Usuario.
 * Inicializada en `null` para forzar su uso dentro de un proveedor activo.
 */
const AuthContext = createContext(null)

/**
 * AuthProvider:
 * Componente contenedor envolvente (Wrapper) que expone el estado y los métodos
 * de autenticación a cualquier componente descendiente del árbol React.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Nodos hijos a encapsular bajo el contexto.
 * @returns {JSX.Element} Proveedor de contexto con estado compartido.
 */
export function AuthProvider({ children }) {
  /**
   * Estado reactivo del JWT (JSON Web Token):
   * Recupera el token existente al montar el árbol de componentes.
   */
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('access_token')
    } catch (err) {
      console.error('[AuthContext] Excepción al leer access_token desde localStorage:', err)
      return null
    }
  })

  /**
   * Predicado booleano de autenticación:
   * Determina si el cliente cuenta con un identificador de sesión activo.
   */
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(localStorage.getItem('access_token'))
    } catch {
      return false
    }
  })

  /**
   * Identificador del usuario autenticado:
   * 1. Recupera el nombre de usuario persistido en `localStorage`.
   * 2. Si no existe pero hay un token JWT válido, decodifica el claim `sub` del payload Base64.
   */
  const [username, setUsername] = useState(() => {
    try {
      const stored = localStorage.getItem('username')
      if (stored) return stored

      const token = localStorage.getItem('access_token')
      if (token && token.includes('.')) {
        const payloadBase64 = token.split('.')[1]
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
          return decoded.sub || decoded.username || null
        }
      }
      return null
    } catch {
      return null
    }
  })

  // Estado booleano para indicar operaciones de red en progreso
  const [loading, setLoading] = useState(false)

  /**
   * login:
   * Despacha la solicitud de autenticación al servidor backend mediante OAuth2 Password Grant.
   * Si las credenciales son válidas, persiste el `access_token` en `localStorage` y actualiza
   * el estado interno de React.
   *
   * @param {string} username - Nombre o identificador del usuario.
   * @param {string} password - Clave secreta en texto claro (sanitizada de inmediato tras el despacho).
   * @returns {Promise<Object>} Objeto con la respuesta del servidor (`access_token`, `token_type`).
   * @throws {Error} Excepción HTTP si las credenciales son rechazadas o falla la red.
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
    localStorage.setItem('username', username)
    setToken(access_token)
    setUsername(username)
    setIsAuthenticated(true)

    return response.data
  }

  /**
   * logout:
   * Cierra de forma determinista la sesión del operador.
   * Purga el token JWT del almacenamiento local y restablece los estados
   * reactivos a sus valores iniciales nulos.
   */
  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        user: username ? { username } : null,
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
 * useAuth:
 * Custom Hook de acceso seguro al contexto de autenticación.
 * Lanza una excepción explicativa si se invoca fuera del alcance de un `<AuthProvider />`.
 *
 * @returns {{
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   loading: boolean,
 *   setLoading: Function,
 *   login: Function,
 *   logout: Function
 * }} Objeto de estado y controladores de autenticación.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser utilizado obligatoriamente dentro de un AuthProvider')
  }
  return context
}
