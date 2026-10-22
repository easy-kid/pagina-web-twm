import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, Loader2, Lock, User, AlertCircle, Eye, EyeOff } from '../components/Common/Icons'
import ThemeToggle from '../components/Theme/ThemeToggle'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    } else {
      // Garantizar que los campos estén en blanco al entrar a la vista de login
      setUsername('')
      setPassword('')
      setShowPassword(false)
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const submittedPassword = password
    // Limpieza inmediata del estado sensible en memoria
    setPassword('')

    try {
      await login(username, submittedPassword)
      setUsername('')
      setShowPassword(false)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error de autenticación:', err)
      // Aseguramos que la contraseña permanezca en blanco ante error
      setPassword('')
      if (err.response?.status === 401 || err.response?.status === 422) {
        setError('Credenciales inválidas. Por favor verifique su usuario y contraseña.')
      } else if (err.message === 'Network Error' || !err.response) {
        setError('No se pudo conectar con el servidor de autenticación.')
      } else {
        setError('Ocurrió un error inesperado al iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 py-12 relative transition-colors">
      {/* Botón de tema en la esquina superior derecha */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Cabecera / Identidad */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ULA Monitors</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Plataforma de Monitoreo de Centros de Cultivo
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-8 transition-colors">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Iniciar Sesión</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Ingresa tus credenciales de operador para acceder al panel
          </p>

          {/* Alerta de Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Input Usuario */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. operador1"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acceder al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pie de página informativo */}
        <p className="text-center text-xs text-slate-400 mt-6">
          API UAT: <span className="font-mono text-slate-500">ulamonitors-uat-back.grye.org</span>
        </p>
      </div>
    </div>
  )
}
