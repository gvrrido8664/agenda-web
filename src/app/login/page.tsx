'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, CheckCircle2, Eye, EyeOff } from 'lucide-react'

function authMessage(message: string) {
  if (message.includes('Invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (message.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  if (message.includes('User already registered')) return 'Ya existe una cuenta con este correo.'
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return 'No pudimos completar la solicitud. Inténtalo nuevamente.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isResetMode, setIsResetMode] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsResetMode(new URLSearchParams(window.location.search).get('reset') === 'true')
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isResetMode) {
        const { error: resetError } = await supabase.auth.updateUser({ password })
        if (resetError) throw resetError
        setMessage('Contraseña actualizada. Ya puedes iniciar sesión.')
        setPassword('')
        setIsResetMode(false)
        window.history.replaceState({}, '', '/login')
      } else if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        setMessage('Cuenta creada. Revisa tu correo para confirmarla.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(authMessage(err instanceof Error ? err.message : ''))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordRecovery = async () => {
    if (!email) {
      setError('Ingresa tu correo para recuperar la contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login?reset=true`,
    })
    setLoading(false)
    if (recoveryError) setError(authMessage(recoveryError.message))
    else setMessage('Te enviamos un enlace para cambiar tu contraseña.')
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_32%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-slate-950/30 lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 to-slate-900 p-12 text-white lg:flex">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <CalendarDays className="h-6 w-6" aria-hidden="true" />
            </span>
            Mi Agenda
          </div>
          <div>
            <p className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">Tu semana, clara y en contexto.</p>
            <ul className="mt-8 space-y-4 text-sm text-blue-100">
              {['Organiza cada día en el calendario', 'Conserva tus apuntes semanales', 'Accede desde cualquier dispositivo'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-sky-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-blue-200">Agenda personal y privada</p>
        </section>

        <section className="p-7 sm:p-12 lg:p-14">
          <div className="mb-9">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600 lg:hidden">
              <CalendarDays className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Bienvenido</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Agenda Digital
            </h1>
            <p className="mt-3 text-base text-slate-500">
            {isResetMode ? 'Crea una contraseña nueva' : isSignUp ? 'Crea una nueva cuenta' : 'Inicia sesión en tu cuenta'}
            </p>
          </div>
        
          <form className="space-y-6" onSubmit={handleAuth}>
            <div className="space-y-5">
            {!isResetMode && <div>
                <label htmlFor="email-address" className="mb-2 block text-sm font-medium text-slate-700">Correo electrónico</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              />
            </div>}
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp || isResetMode ? 'new-password' : 'current-password'}
                required
                minLength={6}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-base text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder={isResetMode ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {!isSignUp && !isResetMode && (
                <button type="button" onClick={handlePasswordRecovery} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Olvidé mi contraseña
                </button>
              )}
            </div>
          </div>

          {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <div>
            <button
              type="submit"
              disabled={loading}
                className="flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Cargando...' : isResetMode ? 'Actualizar contraseña' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </div>
          
            {!isResetMode && <div className="text-center text-sm text-slate-500">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>}
          </form>
        </section>
      </div>
    </main>
  )
}
