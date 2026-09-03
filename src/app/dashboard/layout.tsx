'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Calendar, BookOpen, CalendarDays, Download, LogOut, Palette, UserCircle, WifiOff } from 'lucide-react'
import { ThemeProvider, useTheme } from '@/components/providers/ThemeProvider'
import { useState, useEffect } from 'react'
import { getUserProfile, updateUserName } from '@/lib/actions/user'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const [userName, setUserName] = useState<string | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        if (data) {
          if (!data.full_name) {
            setShowNameModal(true)
          } else {
            setUserName(data.full_name)
          }
        }
      })
      .catch(() => setProfileError('No pudimos cargar tu perfil.'))
  }, [])

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    const captureInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    updateConnection()
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    window.addEventListener('beforeinstallprompt', captureInstall)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      window.removeEventListener('beforeinstallprompt', captureInstall)
    }
  }, [])

  const handleSaveName = async () => {
    if (tempName.trim()) {
      setIsSavingName(true)
      setProfileError(null)
      try {
        await updateUserName(tempName.trim())
        setUserName(tempName.trim())
        setShowNameModal(false)
      } catch {
        setProfileError('No pudimos guardar tu nombre. Inténtalo nuevamente.')
      } finally {
        setIsSavingName(false)
      }
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setProfileError('No pudimos cerrar tu sesión.')
      return
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith('agenda-offline:'))
      .forEach((key) => localStorage.removeItem(key))
    router.replace('/login')
    router.refresh()
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const colorOptions = [
    { name: 'Gris', class: 'bg-gray-50', hex: 'bg-gray-200' },
    { name: 'Rosa', class: 'bg-[#FF46A2]/10', hex: 'bg-[#FF46A2]' },
    { name: 'Azul', class: 'bg-blue-50', hex: 'bg-blue-200' },
    { name: 'Verde', class: 'bg-green-50', hex: 'bg-green-200' },
    { name: 'Morado', class: 'bg-purple-50', hex: 'bg-purple-200' },
    { name: 'Amarillo', class: 'bg-amber-50', hex: 'bg-amber-200' },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-transparent lg:h-screen lg:flex-row">
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="profile-title" className="w-full max-w-sm rounded-2xl border border-white/40 bg-white p-7 text-center shadow-2xl">
            <UserCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 id="profile-title" className="mb-2 text-xl font-semibold text-slate-900">¡Bienvenido/a!</h2>
            <p className="mb-6 text-sm text-slate-500">Para personalizar tu agenda, ¿cómo te llamas?</p>
            <label htmlFor="profile-name" className="sr-only">Tu nombre</label>
            <input
              id="profile-name"
              type="text"
              className="mb-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-lg font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Tu nombre..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            {profileError && <p role="alert" className="mb-4 text-sm text-red-600">{profileError}</p>}
            <button
              onClick={handleSaveName}
              disabled={!tempName.trim() || isSavingName}
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingName ? 'Guardando...' : 'Comenzar'}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="z-20 flex w-full shrink-0 flex-col border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 lg:h-20 lg:px-7">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Mi Agenda</h1>
            <p className="text-xs text-slate-500">Organización personal</p>
          </div>
          {!isOnline && <WifiOff className="ml-auto h-5 w-5 text-amber-600 lg:hidden" aria-label="Sin conexión" />}
          {installPrompt && (
            <button
              onClick={handleInstall}
              className={`${isOnline ? 'ml-auto' : ''} rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 lg:hidden`}
              aria-label="Instalar aplicación"
              title="Instalar aplicación"
            >
              <Download className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={`${isOnline && !installPrompt ? 'ml-auto' : ''} rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 lg:hidden`}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        
        <nav aria-label="Navegación principal" className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-5 lg:py-6">
          <Link 
            href="/dashboard"
            className={`flex shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-5 h-5 mr-3" />
            Calendario
          </Link>
          
          <Link 
            href="/dashboard/journal"
            className={`flex shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              pathname === '/dashboard/journal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-5 h-5 mr-3" />
            Bitácora
          </Link>
        </nav>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-2.5 lg:hidden">
          <Palette className="mr-1 h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-wider text-slate-400">Fondo</span>
          {colorOptions.map((color) => (
            <button
              key={color.class}
              onClick={() => setTheme(color.class)}
              title={color.name}
              aria-label={`Fondo ${color.name}`}
              aria-pressed={theme === color.class}
              className={`h-5 w-5 rounded-full border-2 ${color.hex} ${theme === color.class ? 'scale-110 border-slate-500' : 'border-transparent'}`}
            />
          ))}
        </div>

        {/* Selector de Tema */}
        <div className="hidden border-t border-slate-100 px-6 py-5 lg:block">
          <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            <Palette className="w-4 h-4 mr-2" />
            Fondo
          </div>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button
                key={c.class}
                onClick={() => setTheme(c.class)}
                title={c.name}
                aria-label={`Fondo ${c.name}`}
                aria-pressed={theme === c.class}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${c.hex} ${theme === c.class ? 'border-gray-500 scale-110' : 'border-transparent'}`}
              />
            ))}
          </div>
        </div>

        <div className="hidden border-t border-slate-100 bg-slate-50/70 px-5 py-5 lg:block">
          {!isOnline && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <WifiOff className="h-4 w-4" />
              Trabajando sin conexión
            </div>
          )}
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="mb-3 flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
            >
              <Download className="mr-3 h-4 w-4" />
              Instalar aplicación
            </button>
          )}
          {userName && (
            <div className="text-sm font-bold text-gray-700 mb-3 px-2 flex items-center">
              <UserCircle className="w-4 h-4 mr-2 text-blue-600" />
              Agenda de {userName}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {profileError && !showNameModal && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
            {profileError}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardInner>{children}</DashboardInner>
    </ThemeProvider>
  )
}
