'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('users').select('id, email, full_name').eq('id', user.id).single()
  if (error) throw new Error('No se pudo cargar el perfil')
  return data
}

export async function updateUserName(fullName: string) {
  const name = fullName.trim()
  if (!name || name.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { error } = await supabase.from('users').update({ full_name: name }).eq('id', user.id)
  if (error) throw new Error('No se pudo actualizar el perfil')
  
  revalidatePath('/dashboard')
}
