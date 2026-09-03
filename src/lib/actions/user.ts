'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function getUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('users').select('id, email, full_name').eq('id', user.id).maybeSingle()
  if (error) throw new Error('No se pudo cargar el perfil')
  if (data) return data

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || !user.email) throw new Error('No se pudo crear el perfil')

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: created, error: createError } = await admin
    .from('users')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
    .select('id, email, full_name')
    .single()

  if (createError) throw new Error('No se pudo crear el perfil')
  return created
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
