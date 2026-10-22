/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Inicialización inmediata desde localStorage para evitar cascadas de renderizado
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('access_token')
    } catch (err) {
      console.error('Error accediendo a localStorage:', err)
      return null
    }
  })

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(localStorage.getItem('access_token'))
    } catch {
      return false
    }
  })

  const [loading, setLoading] = useState(false)

  // Inicio de sesión compatible con FastAPI OAuth2PasswordRequestForm
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

  // Cierre de sesión y limpieza de credenciales
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

// Hook de acceso al contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }
  return context
}
