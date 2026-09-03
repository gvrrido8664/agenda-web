import { deleteEvent, saveEvent } from '@/lib/actions/notes'
import { upsertWeeklyLog } from '@/lib/actions/logs'
import { createClient } from '@/lib/supabase/client'

type OfflineOperation =
  | { kind: 'save-event', localId: string, payload: Parameters<typeof saveEvent> }
  | { kind: 'delete-event', localId: string, payload: Parameters<typeof deleteEvent> }
  | { kind: 'save-log', localId: string, payload: Parameters<typeof upsertWeeklyLog> }

const prefix = 'agenda-offline'

async function scopedKey(key: string) {
  const { data: { session } } = await createClient().auth.getSession()
  return `${prefix}:${session?.user.id ?? 'anonymous'}:${key}`
}

export async function readOffline<T>(key: string): Promise<T | null> {
  try {
    const value = localStorage.getItem(await scopedKey(key))
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

export async function writeOffline(key: string, value: unknown) {
  // ponytail: localStorage caps offline data at a few MB; migrate to IndexedDB if notes grow materially.
  localStorage.setItem(await scopedKey(key), JSON.stringify(value))
}

export async function queueOffline(operation: OfflineOperation) {
  const key = await scopedKey('queue')
  const queue = readQueue(key).filter((item) => item.localId !== operation.localId)

  if (operation.kind !== 'delete-event' || !operation.localId.startsWith('offline-')) {
    queue.push(operation)
  }

  localStorage.setItem(key, JSON.stringify(queue))
}

export async function flushOfflineQueue() {
  if (!navigator.onLine) return

  const key = await scopedKey('queue')
  const queue = readQueue(key)

  while (queue.length) {
    const operation = queue[0]
    try {
      if (operation.kind === 'save-event') await saveEvent(...operation.payload)
      if (operation.kind === 'delete-event') await deleteEvent(...operation.payload)
      if (operation.kind === 'save-log') await upsertWeeklyLog(...operation.payload)
      queue.shift()
      localStorage.setItem(key, JSON.stringify(queue))
    } catch {
      break
    }
  }
}

function readQueue(key: string): OfflineOperation[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as OfflineOperation[]
  } catch {
    return []
  }
}
