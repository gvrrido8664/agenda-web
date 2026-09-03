'use client'

import { cloneElement, useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Calendar, momentLocalizer, type DateCellWrapperProps, type Event, type ToolbarProps } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import moment from 'moment'
import 'moment/locale/es'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDailyNotes, saveEvent, deleteEvent } from '@/lib/actions/notes'
import { Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { flushOfflineQueue, queueOffline, readOffline, writeOffline } from '@/lib/offline'

moment.locale('es')
const localizer = momentLocalizer(moment)

type DailyNote = {
  id: string
  date: string
  title: string | null
  content: string | null
}

type CalendarEvent = Event & {
  id: string
  start: Date
  end: Date
  resource: DailyNote
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [mutationError, setMutationError] = useState<string | null>(null)
  
  const queryClient = useQueryClient()
  const { theme } = useTheme()

  const start = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM-dd')
  const end = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), 'yyyy-MM-dd')
  const cacheKey = `notes:${start}:${end}`

  const { data: notes, isLoading, isError } = useQuery({
    queryKey: ['notes', start, end],
    queryFn: async () => {
      const cached = await readOffline<DailyNote[]>(cacheKey)
      if (!navigator.onLine) return cached ?? []
      try {
        const data = await getDailyNotes(start, end)
        await writeOffline(cacheKey, data)
        return data
      } catch (error) {
        if (cached) return cached
        throw error
      }
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string | null, date: string, title: string, content: string }) => {
      if (navigator.onLine) return saveEvent(data.id, data.date, data.title, data.content)

      const localId = data.id ?? `offline-${crypto.randomUUID()}`
      const cached = await readOffline<DailyNote[]>(cacheKey) ?? []
      const note = { id: localId, date: data.date, title: data.title || 'Sin título', content: data.content }
      await writeOffline(cacheKey, [...cached.filter((item) => item.id !== localId), note])
      await queueOffline({
        kind: 'save-event',
        localId,
        payload: [data.id?.startsWith('offline-') ? null : data.id, data.date, data.title, data.content],
      })
      return [note]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setMutationError(null)
      setModalOpen(false)
    },
    onError: () => setMutationError('No pudimos guardar el evento. Inténtalo nuevamente.')
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (navigator.onLine) return deleteEvent(id)

      const cached = await readOffline<DailyNote[]>(cacheKey) ?? []
      await writeOffline(cacheKey, cached.filter((item) => item.id !== id))
      await queueOffline({ kind: 'delete-event', localId: id, payload: [id] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setMutationError(null)
      setModalOpen(false)
    },
    onError: () => setMutationError('No pudimos eliminar el evento. Inténtalo nuevamente.')
  })

  useEffect(() => {
    const sync = () => flushOfflineQueue().then(() => queryClient.invalidateQueries({ queryKey: ['notes'] }))
    window.addEventListener('online', sync)
    void sync()
    return () => window.removeEventListener('online', sync)
  }, [queryClient])

  const events: CalendarEvent[] = notes?.map((note: DailyNote) => {
    const [year, month, day] = note.date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    return {
      id: note.id,
      title: note.title || note.content?.substring(0, 20) || 'Evento',
      start: localDate,
      end: localDate,
      allDay: true,
      resource: note
    }
  }) || []

  // Extraer el color principal del tema actual de forma tosca pero efectiva
  const themeColors: Record<string, string> = {
    'bg-gray-50': '#4b5563',
    'bg-[#FF46A2]/10': '#FF46A2',
    'bg-blue-50': '#3b82f6',
    'bg-green-50': '#22c55e',
    'bg-purple-50': '#a855f7',
    'bg-amber-50': '#f59e0b',
  }
  const eventColor = themeColors[theme] || '#3b82f6'

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: eventColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block'
      }
    }
  }

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedDate(start)
    setEventId(null)
    setEventTitle('')
    setEventContent('')
    setMutationError(null)
    setModalOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedDate(event.start)
    setEventId(event.id)
    setEventTitle(event.resource.title || '')
    setEventContent(event.resource.content || '')
    setMutationError(null)
    setModalOpen(true)
  }, [])

  const TouchDateCell = useCallback(({ children, value }: DateCellWrapperProps) => cloneElement(children, {
    onPointerUp: (event: ReactPointerEvent) => event.pointerType === 'touch' && handleSelectSlot({ start: value })
  }), [handleSelectSlot])

  const handleSave = () => {
    if (selectedDate) {
      saveMutation.mutate({
        id: eventId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: eventTitle,
        content: eventContent,
      })
    }
  }

  const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent>) => {
    const goToBack = () => toolbar.onNavigate('PREV')
    const goToNext = () => toolbar.onNavigate('NEXT')
    const goToCurrent = () => toolbar.onNavigate('TODAY')

    const label = () => {
      const text = toolbar.label
      if (!text) return ''
      return text.charAt(0).toUpperCase() + text.slice(1)
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-2 bg-white/80 p-1 border border-white/50 rounded-lg shadow-sm">
          <button onClick={goToBack} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white" title="Anterior" aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToCurrent} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white sm:px-4">
            Mes Actual
          </button>
          <button onClick={goToNext} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white" title="Siguiente" aria-label="Mes siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-semibold capitalize tracking-tight text-slate-900 sm:text-2xl">
          {label()}
        </h2>

        <div className="hidden w-[120px] sm:block" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}
      {isError && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No pudimos cargar tus eventos. Revisa tu conexión e inténtalo nuevamente.
        </div>
      )}
      
      <div className="flex-1 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-xl shadow-slate-200/40 backdrop-blur-md sm:p-6">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 14rem)' }}
          views={['month']}
          defaultView={'month'}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          culture="es"
          formats={{
            weekdayFormat: (date: Date) => {
              const day = format(date, 'EEE', { locale: es })
              return day.charAt(0).toUpperCase() + day.slice(1)
            }
          }}
          components={{
            toolbar: CustomToolbar,
            dateCellWrapper: TouchDateCell
          }}
        />
      </div>

      {modalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onKeyDown={(event) => event.key === 'Escape' && setModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" className="flex w-full max-w-lg flex-col rounded-2xl border border-white/40 bg-white p-6 shadow-2xl sm:p-7">
            <h3 id="event-dialog-title" className="mb-5 text-xl font-semibold capitalize text-slate-900">
              {eventId ? 'Editar evento' : 'Nuevo evento'} · {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            <label htmlFor="event-title" className="mb-2 text-sm font-medium text-slate-700">Título</label>
            <input
              id="event-title"
              autoFocus
              maxLength={120}
              className="mb-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Nombre del evento..."
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />

            <label htmlFor="event-notes" className="mb-2 text-sm font-medium text-slate-700">Notas</label>
            <textarea
              id="event-notes"
              className="h-32 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Añade tus apuntes, notas o detalles del evento aquí..."
              value={eventContent}
              onChange={(e) => setEventContent(e.target.value)}
            />
            {mutationError && <p role="alert" className="mt-3 text-sm text-red-600">{mutationError}</p>}
            
            <div className="mt-6 flex justify-between items-center">
              {eventId ? (
                <button
                  className="flex items-center rounded-xl px-4 py-2 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  onClick={() => confirm('¿Eliminar este evento? Esta acción no se puede deshacer.') && deleteMutation.mutate(eventId)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-5 h-5 mr-2" /> Eliminar
                </button>
              ) : <div></div>}
              
              <div className="flex space-x-3">
                <button
                  className="rounded-xl px-5 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
