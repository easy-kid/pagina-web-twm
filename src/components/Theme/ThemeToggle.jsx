/**
 * COMPONENTE CONMUTADOR DE TEMA VISUAL (ThemeToggle.jsx)
 * COMPONENTE CONMUTADOR DE TEMA VISUAL (ThemeToggle.jsx)
 */

import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from '../Common/Icons'

/**
 * ThemeToggle:
 * Disparador de interfaz para la alternancia de tema visual.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.className=''] - Clases CSS complementarias de Tailwind.
 * @param {boolean} [props.showLabel=false] - Indica si se debe mostrar texto descriptivo junto al icono.
 * @returns {JSX.Element} Botón conmutador estilizado.
 */
export default function ThemeToggle({ className = '', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
        isDark
          ? 'bg-slate-800 text-indigo-300 hover:text-indigo-200 hover:bg-slate-700 border border-slate-700'
          : 'bg-slate-100 text-amber-500 hover:text-amber-600 hover:bg-slate-200 border border-slate-200'
      } ${className}`}
      aria-label="Alternar modo oscuro"
    >
      {/* Icono vectorial representativo según el modo activo */}
      {isDark ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}

      {/* Rótulo de texto contextual condicional */}
      {showLabel && (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {isDark ? 'Modo Oscuro' : 'Modo Claro'}
        </span>
      )}
    </button>
  )
}
