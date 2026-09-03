import CalendarView from '@/components/calendar/CalendarView'

export default function DashboardPage() {
  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col p-4 sm:p-6 lg:p-8">
      <header className="mb-5 sm:mb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Planificación</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Calendario</h2>
        <p className="mt-2 text-base text-slate-500">Organiza tus eventos y notas de cada día.</p>
      </header>
      <CalendarView />
    </div>
  )
}
