/**
 * =============================================================================
 * COMPONENTE DE ESTRUCTURA Y NAVEGACIÓN GLOBAL (MainLayout.jsx)
 * =============================================================================
 * Actúa como contenedor envolvente ("Shell") persistente para todas las rutas
 * autenticadas y protegidas de la aplicación (definidas en App.jsx).
 *
 * Principios de Arquitectura en React y React Router:
 * 1. Composición de Enrutamiento Anidado (`<Outlet />`):
 *    Marcador de posición declarativo donde el motor de React Router inyecta
 *    dinámicamente el componente hijo asociado a la URL activa (Dashboard o Detalle de Sensor).
 *
 * 2. Navegación en Cliente (Client-Side Routing con `NavLink`):
 *    Intercepta los eventos de clic en el agente de usuario, mutando el historial HTML5
 *    sin emitir peticiones de documento completas ni desechar el estado en memoria.
 *
 * 3. Diseño Responsivo y Adaptabilidad Multi-Dispositivo:
 *    - En móvil (< 768px): Cabecera compacta con menú hamburguesa y botón de tema.
 *    - En escritorio (>= 768px): Barra lateral fija (`aside`) con ThemeToggle integrado
 *      en la cabecera y accesos persistentes.
 */

import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from '../Common/Icons'
import ThemeToggle from '../Theme/ThemeToggle'

/**
 * MainLayout:
 * Función componente de plantilla global que encapsula el sidebar de navegación,
 * la barra superior móvil y el punto de montaje de las rutas internas.
 *
 * @returns {JSX.Element} Estructura de layout compartida.
 */
export default function MainLayout() {
  // Consumo de la sesión y método `logout` desde el AuthContext global
  const { logout, username } = useAuth()
  const navigate = useNavigate()

  // Nombre de usuario para presentación en la barra lateral
  const userDisplayName = username || 'Operador'
  // Iniciales para el avatar (ej. "operador1" -> "OP", "admin" -> "AD")
  const userInitials = (userDisplayName.length >= 2
    ? userDisplayName.slice(0, 2)
    : userDisplayName
  ).toUpperCase()

  // Estado local para abrir o contraer el menú en dispositivos móviles
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /**
   * handleLogout:
   * Procedimiento de cierre de sesión:
   * 1. Invoca `logout()` para destruir el JWT en memoria y en `localStorage`.
   * 2. Despacha una transición de navegación forzada hacia `/login`.
   */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Lista de descriptores de navegación principal
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
  ]

  /**
   * getNavLinkClass:
   * Generador de clases CSS de Tailwind que evalúa reactivamente el predicado `isActive`
   * inyectado por `NavLink`, aplicando contraste de color y relieve según el estado de selección.
   *
   * @param {{ isActive: boolean }} param0 - Objeto de estado inyectado por React Router.
   * @returns {string} Cadena de clases CSS resultantes.
   */
  const getNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
    }`

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* 
        =======================================================================
        BARRA SUPERIOR EN DISPOSITIVOS MÓVILES (< 768px)
        =======================================================================
      */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">ULAtors</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* 
        =======================================================================
        SIDEBAR DE NAVEGACIÓN (Lateral fija en Desktop, colapsable en Móviles)
        =======================================================================
      */}
      <aside
        className={`${mobileMenuOpen ? 'block' : 'hidden'
          } md:flex flex-col w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 md:sticky md:top-0 md:h-screen shrink-0 transition-colors`}
      >
        {/* Cabecera del Sidebar (Visible en Desktop con interruptor de tema) */}
        <div className="hidden md:flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-tight tracking-tight">ULAtors</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sistema de Monitoreo</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Lista de Enlaces de Navegación */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navegación
          </div>
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={getNavLinkClass}
              >
                <IconComponent className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Pie del Sidebar: Identificación de Usuario y Botón de Salir */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold text-xs">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={userDisplayName}>
                {userDisplayName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* 
        =======================================================================
        ÁREA DE CONTENIDO PRINCIPAL (Desktop y Móvil)
        =======================================================================
      */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Punto de inyección del contenido dinámico de la página */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
