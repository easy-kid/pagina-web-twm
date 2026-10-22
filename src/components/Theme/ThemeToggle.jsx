import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '', showLabel = false }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

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

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
        isDark
          ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700'
          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
      } ${className}`}
      aria-label="Alternar modo oscuro"
    >
      {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
      {showLabel && (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </button>
  )
}
