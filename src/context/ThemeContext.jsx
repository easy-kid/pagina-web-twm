/* eslint-disable react-refresh/only-export-components */
/**
 * CONTEXTO DE GESTIÓN DE TEMA Y ESTILOS (ThemeContext.jsx)
 * CONTEXTO DE GESTIÓN DE TEMA Y ESTILOS (ThemeContext.jsx)
 */

import { createContext, useContext, useState, useEffect } from 'react'

/**
 * Contexto de React para el estado del tema visual.
 */
const ThemeContext = createContext()

/**
 * ThemeProvider:
 * Proveedor de contexto que administra el estado booleano `isDark` y el mutador `toggleTheme`.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Subárbol de componentes envuelto.
 * @returns {JSX.Element} Proveedor con los valores de tema expuestos.
 */
export function ThemeProvider({ children }) {
  /**
   * Estado reactivo de tema con inicialización perezosa:
   * 1. Revisa si existe una preferencia guardada en `localStorage`.
   * 2. Si no existe, detecta la configuración del sistema operativo (`window.matchMedia`).
   */
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  /**
   * Sincronización del DOM y Persistencia:
   * Reacciona ante cualquier mutación de `isDark`, inyectando o removiendo la clase `dark`
   * en `document.documentElement` y persistiendo el valor en `localStorage`.
   */
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  /**
   * toggleTheme:
   * Función mutadora idempotente que invierte el estado booleano del tema actual.
   */
  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * useTheme:
 * Custom Hook para acceder al estado y controlador de tema visual.
 *
 * @returns {{ isDark: boolean, toggleTheme: Function }} Objeto con estado y disparador.
 * @throws {Error} Si se consume fuera de la jerarquía de un `<ThemeProvider />`.
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe ser utilizado obligatoriamente dentro de un ThemeProvider')
  }
  return context
}
