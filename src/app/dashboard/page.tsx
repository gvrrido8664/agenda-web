import CalendarView from '@/components/calendar/CalendarView'

export default function DashboardPage() {
  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col p-2 sm:p-6 lg:p-8">
      <header className="mb-3 sm:mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 sm:text-sm">Planificación</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">Calendario</h2>
        <p className="mt-2 hidden text-base text-slate-500 sm:block">Organiza tus eventos y notas de cada día.</p>
      </header>
      <CalendarView />
    </div>
  )
}
