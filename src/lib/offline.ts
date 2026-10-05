import { deleteEvent, saveEvent } from '@/lib/actions/notes'
import { upsertWeeklyLog } from '@/lib/actions/logs'
import { createClient } from '@/lib/supabase/client'

type OfflineOperation =
  | { kind: 'save-event', localId: string, payload: Parameters<typeof saveEvent> }
  | { kind: 'delete-event', localId: string, payload: Parameters<typeof deleteEvent> }
  | { kind: 'save-log', localId: string, payload: Parameters<typeof upsertWeeklyLog> }

const prefix = 'agenda-offline'
// ponytail: one flush per account in this tab; cross-tab coordination needs Web Locks.
const activeFlushes = new Map<string, Promise<boolean>>()

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
  if (!navigator.onLine) return false

  const key = await scopedKey('queue')
  const active = activeFlushes.get(key)
  if (active) return active
  const pending = flushQueue(key).finally(() => activeFlushes.delete(key))
  activeFlushes.set(key, pending)
  return pending
}

async function flushQueue(key: string) {
  while (navigator.onLine) {
    const queue = readQueue(key)
    if (!queue.length) return true
    const operation = queue[0]
    try {
      if (await scopedKey('queue') !== key) return false
      const saved = operation.kind === 'save-event' ? await saveEvent(...operation.payload) : null
      if (operation.kind === 'delete-event') await deleteEvent(...operation.payload)
      if (operation.kind === 'save-log') await upsertWeeklyLog(...operation.payload)
      // Re-read after the request: another edit may have changed the queue meanwhile.
      const latest = readQueue(key)
      const index = latest.findIndex(item => item.localId === operation.localId)
      if (index >= 0) {
        const current = latest[index]
        if (JSON.stringify(current) === JSON.stringify(operation)) latest.splice(index, 1)
        else if (operation.kind === 'save-event' && !operation.payload[0] && current.kind === 'save-event' && saved?.[0]?.id) {
          current.payload[0] = saved[0].id
        }
      }
      localStorage.setItem(key, JSON.stringify(latest))
    } catch {
      return false
    }
  }
  return readQueue(key).length === 0
}

function readQueue(key: string): OfflineOperation[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as OfflineOperation[]
  } catch {
    return []
  }
}
