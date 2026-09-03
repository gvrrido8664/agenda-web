'use client'

import { useState, useEffect } from 'react'
import { addWeeks, getISOWeek, getISOWeekYear, subWeeks } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeeklyLog, upsertWeeklyLog } from '@/lib/actions/logs'
import JournalEditor from '@/components/journal/JournalEditor'
import { ChevronLeft, ChevronRight, Loader2, Edit3 } from 'lucide-react'
import { flushOfflineQueue, queueOffline, readOffline, writeOffline } from '@/lib/offline'

type WeeklyLog = {
  content_markdown: string | null
}

export default function JournalPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [saveError, setSaveError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isoWeek = getISOWeek(currentDate)
  const year = getISOWeekYear(currentDate)
  const cacheKey = `log:${year}:${isoWeek}`

  const { data: log, isLoading } = useQuery({
    queryKey: ['weekly_log', year, isoWeek],
    queryFn: async () => {
      const cached = await readOffline<WeeklyLog>(cacheKey)
      if (!navigator.onLine) return cached
      try {
        const data = await getWeeklyLog(isoWeek, year)
        await writeOffline(cacheKey, data)
        return data
      } catch (error) {
        if (cached) return cached
        throw error
      }
    },
  })

  // Iniciar en modo edición si no hay bitácora guardada
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsEditing(!log)
    }
  }, [log, isLoading, isoWeek, year])

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      if (navigator.onLine) return upsertWeeklyLog(isoWeek, year, content)
      await writeOffline(cacheKey, { content_markdown: content })
      await queueOffline({
        kind: 'save-log',
        localId: `${year}:${isoWeek}`,
        payload: [isoWeek, year, content],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly_log'] })
      setSaveError(null)
      setIsEditing(false) // Cambiar a modo lectura al guardar
    },
    onError: (error: Error) => {
      setSaveError(error.message)
    }
  })

  useEffect(() => {
    const sync = () => flushOfflineQueue().then(() => queryClient.invalidateQueries({ queryKey: ['weekly_log'] }))
    window.addEventListener('online', sync)
    void sync()
    return () => window.removeEventListener('online', sync)
  }, [queryClient])

  const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1))
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1))
  const handleToday = () => setCurrentDate(new Date())

  // Nueva plantilla con tabla de 2 columnas para separar días
  const template = `
    <table style="width: 100%; border-collapse: collapse;">
      <tbody>
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Lunes</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
            <hr />
            <p><strong>Martes</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
            <hr />
            <p><strong>Miércoles</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Jueves</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
            <hr />
            <p><strong>Viernes</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
            <hr />
            <p><strong>Fin de Semana</strong></p>
            <p>Importantes:</p><ul><li><p></p></li></ul>
            <p>Auto estudio:</p><ul><li><p></p></li></ul>
            <p>Clases:</p><ul><li><p></p></li></ul>
          </td>
        </tr>
      </tbody>
    </table>
  `

  const contentToRender = log?.content_markdown || template

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Reflexión semanal</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Bitácora</h2>
          <p className="mt-2 text-base text-slate-500">
            Semana {isoWeek} del {year}
          </p>
        </div>
        
        <div className="flex items-center self-start rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm sm:self-auto">
          <button onClick={handlePrevWeek} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Semana anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleToday} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">
            Semana Actual
          </button>
          <button onClick={handleNextWeek} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Semana siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {saveError && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No pudimos guardar la bitácora: {saveError}
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50/80 z-10 flex items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        
        {!isLoading && isEditing ? (
          <JournalEditor 
            initialContent={contentToRender}
            template={template}
            onSave={(content) => mutation.mutate(content)}
            isSaving={mutation.isPending}
          />
        ) : !isLoading && !isEditing ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-5 py-3 sm:px-6">
              <p className="text-sm font-medium text-slate-500">Vista de lectura</p>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Bitácora
              </button>
            </div>
            <JournalEditor initialContent={contentToRender} template={template} readOnly />
          </div>
        ) : null}
      </div>
    </div>
  )
}
