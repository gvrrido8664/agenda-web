'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDailyNotes(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Rango de fechas inválido')
  }

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data, error } = await supabase
    .from('daily_notes')
    .select('id, date, title, content')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error(error.message)
  return data
}

export async function saveEvent(id: string | null, date: string, title: string, content: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida')
  if (title.length > 120) throw new Error('El título no puede superar 120 caracteres')

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const payload = {
    date,
    title: title.trim() || 'Sin título',
    content,
    user_id: user.id,
    updated_at: new Date().toISOString()
  }
  
  let request;
  if (id) {
    request = supabase.from('daily_notes').update(payload).eq('id', id).eq('user_id', user.id)
  } else {
    request = supabase.from('daily_notes').insert(payload)
  }
  
  const { data, error } = await request.select()

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
  return data
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { error } = await supabase.from('daily_notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
}
