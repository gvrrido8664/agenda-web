'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWeeklyLog(isoWeek: number, year: number) {
  if (!Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53 || !Number.isInteger(year)) {
    throw new Error('Semana inválida')
  }

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data, error } = await supabase
    .from('weekly_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('iso_week', isoWeek)
    .eq('year', year)
    .single()

  // Supabase devuelve error si no encuentra un single(), lo cual es normal si no existe la bitácora
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }
  
  return data || null
}

export async function upsertWeeklyLog(isoWeek: number, year: number, contentMarkdown: string) {
  if (!Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53 || !Number.isInteger(year)) {
    throw new Error('Semana inválida')
  }

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data, error } = await supabase
    .from('weekly_logs')
    .upsert({ 
      user_id: user.id,
      iso_week: isoWeek,
      year: year,
      content_markdown: contentMarkdown,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,iso_week,year' })
    .select()

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard/journal')
  return data
}
