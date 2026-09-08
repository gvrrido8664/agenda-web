'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [saveStatus, setSaveStatus] = useState('')
  const initializedWeek = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const isoWeek = getISOWeek(currentDate)
  const year = getISOWeekYear(currentDate)
  const cacheKey = `log:${year}:${isoWeek}`

  const { data: log, isLoading, isError } = useQuery({
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
    if (!isLoading && initializedWeek.current !== cacheKey) {
      setIsEditing(!log)
      initializedWeek.current = cacheKey
      setSaveStatus('')
    }
  }, [cacheKey, isLoading, log])

  const mutation = useMutation({
    mutationFn: async (data: { content: string, finish?: boolean, week: number, year: number, key: string }) => {
      if (navigator.onLine) {
        await upsertWeeklyLog(data.week, data.year, data.content)
        return { offline: false }
      }
      await writeOffline(data.key, { content_markdown: data.content })
      await queueOffline({
        kind: 'save-log',
        localId: `${data.year}:${data.week}`,
        payload: [data.week, data.year, data.content],
      })
      return { offline: true }
    },
    onMutate: () => setSaveStatus('Guardando…'),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(['weekly_log', variables.year, variables.week], { content_markdown: variables.content })
      setSaveError(null)
      setSaveStatus(result.offline ? 'Guardado localmente' : 'Guardado')
      if (variables.finish) setIsEditing(false)
    },
    onError: (error: Error) => {
      setSaveError(error.message)
      setSaveStatus('No se pudo guardar')
    }
  })

  useEffect(() => {
    const sync = (showStatus = false) => flushOfflineQueue().then((synced) => {
      queryClient.invalidateQueries({ queryKey: ['weekly_log'] })
      if (showStatus) setSaveStatus(synced ? 'Sincronizado' : 'Pendiente de sincronización')
    })
    const handleOnline = () => void sync(true)
    window.addEventListener('online', handleOnline)
    void sync()
    return () => window.removeEventListener('online', handleOnline)
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
    <div className="mx-auto flex h-full max-w-6xl flex-col p-3 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-7 sm:flex-row sm:items-end sm:gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 sm:text-sm">Reflexión semanal</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">Bitácora</h2>
          <p className="mt-1 text-sm text-slate-500 sm:mt-2 sm:text-base">
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
        {isError && !isLoading && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No pudimos cargar esta bitácora.</div>
        )}
        {!isEditing && saveStatus && <p role="status" className="mb-3 text-right text-xs font-medium text-slate-500">{saveStatus}</p>}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50/80 z-10 flex items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        
        {!isLoading && !isError && isEditing ? (
          <JournalEditor 
            key={cacheKey}
            initialContent={contentToRender}
            template={template}
            onSave={(content, finish) => mutation.mutate({ content, finish, week: isoWeek, year, key: cacheKey })}
            isSaving={mutation.isPending}
            saveStatus={saveStatus}
          />
        ) : !isLoading && !isError && !isEditing ? (
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
            <JournalEditor
              key={cacheKey}
              initialContent={contentToRender}
              template={template}
              onSave={(content) => mutation.mutate({ content, week: isoWeek, year, key: cacheKey })}
              readOnly
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
