import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building, LayoutDashboard } from './Common/Icons'

export default function NotFoundPage({ message = 'La página o el recurso que buscas no existe.' }) {
  const navigate = useNavigate()

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
        Error 404
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
        No encontrado
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {message}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <LayoutDashboard className="h-4 w-4" />
          Ir al panel
        </Link>
        <Link
          to="/sites"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Building className="h-4 w-4" />
          Ver centros
        </Link>
      </div>
    </section>
  )
}
