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
import { Loader2, Trash2, ChevronLeft, ChevronRight, Plus, Edit2 } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { flushOfflineQueue, queueOffline, readOffline, writeOffline } from '@/lib/offline'
import CalendarEditor from './CalendarEditor'

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
  const [isViewing, setIsViewing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [originalEventContent, setOriginalEventContent] = useState('')
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [showPastEvents, setShowPastEvents] = useState(false)
  
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
      if (navigator.onLine) {
        await saveEvent(data.id, data.date, data.title, data.content)
        return { offline: false }
      }

      const localId = data.id ?? `offline-${crypto.randomUUID()}`
      const cached = await readOffline<DailyNote[]>(cacheKey) ?? []
      const note = { id: localId, date: data.date, title: data.title || 'Sin título', content: data.content }
      await writeOffline(cacheKey, [...cached.filter((item) => item.id !== localId), note])
      await queueOffline({
        kind: 'save-event',
        localId,
        payload: [data.id?.startsWith('offline-') ? null : data.id, data.date, data.title, data.content],
      })
      return { offline: true }
    },
    onMutate: () => setSaveStatus('Guardando…'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setMutationError(null)
      setSaveStatus(result.offline ? 'Guardado localmente' : 'Guardado')
    },
    onError: () => {
      setMutationError('No pudimos guardar el evento. Inténtalo nuevamente.')
      setSaveStatus('No se pudo guardar')
    }
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
    const sync = (showStatus = false) => flushOfflineQueue().then((synced) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (showStatus) setSaveStatus(synced ? 'Sincronizado' : 'Pendiente de sincronización')
    })
    const handleOnline = () => void sync(true)
    window.addEventListener('online', handleOnline)
    void sync()
    return () => window.removeEventListener('online', handleOnline)
  }, [queryClient])

  const events: CalendarEvent[] = notes?.map((note: DailyNote) => {
    const [year, month, day] = note.date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    const endDate = new Date(year, month - 1, day, 23, 59, 59)
    return {
      id: note.id,
      title: note.title || note.content?.substring(0, 20) || 'Evento',
      start: localDate,
      end: endDate,
      allDay: true,
      resource: note
    }
  }) || []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()
  const sortedMobileEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  const pastEventCount = isCurrentMonth ? sortedMobileEvents.filter((event) => event.start < today).length : 0
  const visibleMobileEvents = showPastEvents ? sortedMobileEvents : sortedMobileEvents.filter((event) => !isCurrentMonth || event.start >= today)
  const mobileEventGroups = visibleMobileEvents.reduce<Array<{ date: Date, events: CalendarEvent[] }>>((groups, event) => {
    const last = groups[groups.length - 1]
    if (last && last.date.toDateString() === event.start.toDateString()) last.events.push(event)
    else groups.push({ date: event.start, events: [event] })
    return groups
  }, [])

  useEffect(() => setShowPastEvents(false), [start])

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
    setOriginalEventContent('')
    setMutationError(null)
    setIsViewing(false)
    setModalOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedDate(event.start)
    setEventId(event.id)
    setEventTitle(event.resource.title || '')
    setEventContent(event.resource.content || '')
    setOriginalEventContent(event.resource.content || '')
    setMutationError(null)
    setIsViewing(true)
    setModalOpen(true)
  }, [])

  const TouchDateCell = useCallback(({ children, value }: DateCellWrapperProps) => cloneElement(children, {
    onPointerUp: (event: ReactPointerEvent) => event.pointerType === 'touch' && handleSelectSlot({ start: value })
  }), [handleSelectSlot])

  const CustomDateHeader = useCallback(({ label, date }: { label: string, date: Date }) => (
    <div className="flex items-center justify-end gap-1 pr-1">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleSelectSlot({ start: date })
        }}
        className="z-20 hidden rounded-full p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 sm:inline-flex"
        title="Nuevo evento"
        aria-label={`Nuevo evento el ${label}`}
      >
        <Plus className="w-4 h-4" />
      </button>
      <span className="text-xs font-medium sm:text-sm">{label}</span>
    </div>
  ), [handleSelectSlot])

  const handleSave = () => {
    if (selectedDate) {
      saveMutation.mutate({
        id: eventId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: eventTitle,
        content: eventContent,
      }, {
        onSuccess: () => {
          setOriginalEventContent(eventContent)
          setModalOpen(false)
        }
      })
    }
  }

  const handleClose = () => {
    if (isViewing && eventId && selectedDate && eventContent !== originalEventContent) {
      if (saveMutation.isPending) return
      saveMutation.mutate({
        id: eventId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: eventTitle,
        content: eventContent,
      }, {
        onSuccess: () => {
          setOriginalEventContent(eventContent)
          setModalOpen(false)
        }
      })
      return
    }
    setModalOpen(false)
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
      <div className="mb-3 grid grid-cols-[auto_1fr] items-center gap-2 sm:mb-6 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex w-fit items-center space-x-1 rounded-lg border border-white/50 bg-white/80 p-1 shadow-sm sm:space-x-2">
          <button onClick={goToBack} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white" title="Anterior" aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToCurrent} className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white sm:px-4">
            <span className="sm:hidden">Hoy</span>
            <span className="hidden sm:inline">Mes Actual</span>
          </button>
          <button onClick={goToNext} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white" title="Siguiente" aria-label="Mes siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="truncate text-right text-lg font-semibold capitalize tracking-tight text-slate-900 sm:text-center sm:text-2xl">
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
      {saveStatus && <p role="status" className="mb-2 text-right text-xs font-medium text-slate-500">{saveStatus}</p>}
      
      <div className="flex-1 rounded-xl border border-white/70 bg-white/80 p-1.5 shadow-xl shadow-slate-200/40 backdrop-blur-md sm:rounded-2xl sm:p-6">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          className="agenda-calendar"
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
            dateCellWrapper: TouchDateCell,
            month: {
              dateHeader: CustomDateHeader
            }
          }}
        />
      </div>

      {!isLoading && (
        <section className="mt-3 rounded-xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/30 sm:hidden" aria-labelledby="mobile-events-title">
          <h3 id="mobile-events-title" className="mb-3 text-sm font-semibold text-slate-800">Eventos de este mes</h3>
          {mobileEventGroups.length ? (
            <div className="space-y-4">
              {mobileEventGroups.map((group) => (
                <div key={group.date.toISOString()}>
                  <p className="mb-2 text-xs font-semibold capitalize text-slate-500">{format(group.date, "EEEE d 'de' MMMM", { locale: es })}</p>
                  <div className="space-y-2">
                    {group.events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor }} />
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{String(event.title)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{events.length ? 'No hay próximos eventos este mes.' : 'Aún no hay eventos este mes.'}</p>
          )}
          {pastEventCount > 0 && (
            <button type="button" onClick={() => setShowPastEvents((show) => !show)} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">
              {showPastEvents ? 'Ocultar eventos pasados' : `Mostrar eventos pasados (${pastEventCount})`}
            </button>
          )}
        </section>
      )}

      {modalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onKeyDown={(event) => event.key === 'Escape' && handleClose()}>
          <div role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-white/40 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex justify-between items-start mb-5">
              <h3 id="event-dialog-title" className="text-xl font-semibold capitalize text-slate-900">
                {eventId ? (isViewing ? 'Ver evento' : 'Editar evento') : 'Nuevo evento'} · {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </h3>
              {isViewing && (
                <button
                  autoFocus
                  onClick={() => setIsViewing(false)}
                  className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors ml-4"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
              )}
            </div>

            {isViewing ? (
              <div className="mb-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Título</h4>
                  <p className="text-lg font-medium text-slate-900">{eventTitle || 'Sin título'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Notas</h4>
                  <CalendarEditor content={eventContent || '<p>No hay notas para este evento.</p>'} onChange={setEventContent} readOnly={true} />
                </div>
              </div>
            ) : (
              <>
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

                <label className="mb-2 text-sm font-medium text-slate-700">Notas</label>
                <CalendarEditor content={eventContent} onChange={setEventContent} />
                
              </>
            )}
            {mutationError && <p role="alert" className="mt-3 text-sm text-red-600">{mutationError}</p>}
            
            <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 sm:-bottom-7 sm:-mx-7 sm:-mb-7 sm:px-7">
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
                  onClick={handleClose}
                  disabled={isViewing && saveMutation.isPending}
                >
                  {isViewing && saveMutation.isPending ? 'Guardando...' : isViewing ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isViewing && (
                  <button
                    className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
