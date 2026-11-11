import { createHash } from 'node:crypto'

export function videoWindow(appointment, now = Date.now()) {
  const start = Date.parse(appointment.startAt)
  const end = start + Number(appointment.durationMinutes) * 60_000
  const state =
    appointment.status !== 'scheduled'
      ? 'unavailable'
      : !Number.isFinite(end) || now >= end
        ? 'ended'
        : now < start
          ? 'waiting'
          : 'ready'
  return { state, start, end }
}

export function videoRoomName(id, appointment) {
  // A changed appointment gets a different room, including participant changes.
  const version = [
    id,
    appointment.coachId,
    appointment.clientId,
    appointment.startAt,
    appointment.durationMinutes,
    appointment.updatedAt,
  ]
  return `persuade-${createHash('sha256').update(JSON.stringify(version)).digest('hex').slice(0, 48)}`
}

export function createVideoProvider({
  apiKey = () => process.env.DAILY_API_KEY,
  fetcher = fetch,
} = {}) {
  const pending = new Map()
  async function request(path, body) {
    if (!apiKey()?.trim()) throw new Error('VIDEO_NOT_CONFIGURED')
    const response = await fetcher(`https://api.daily.co/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${apiKey().trim()}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      const error = new Error('VIDEO_PROVIDER_UNAVAILABLE')
      error.status = response.status
      throw error
    }
    return response.json()
  }
  async function ensureRoom(name, appointment) {
    try {
      return await request(`/rooms/${name}`)
    } catch (error) {
      if (error.status !== 404) throw error
    }
    const { start, end } = videoWindow(appointment)
    try {
      return await request('/rooms', {
        name,
        privacy: 'private',
        properties: {
          nbf: Math.floor(start / 1000),
          exp: Math.floor(end / 1000),
          eject_at_room_exp: true,
          max_participants: 2,
          enable_knocking: false,
          enable_prejoin_ui: true,
          enable_screenshare: true,
          enable_chat: true,
          enable_network_ui: true,
          enforce_unique_user_ids: true,
          lang: 'fr',
        },
      })
    } catch (error) {
      // Another server may have created the deterministic room concurrently.
      if (![400, 409].includes(error.status)) throw error
      return request(`/rooms/${name}`)
    }
  }
  return {
    configured: () => Boolean(apiKey()?.trim()),
    async join(id, appointment, uid) {
      const name = videoRoomName(id, appointment)
      if (!pending.has(name)) {
        pending.set(
          name,
          ensureRoom(name, appointment).finally(() => pending.delete(name)),
        )
      }
      const room = await pending.get(name)
      const url = new URL(room.url)
      if (
        room.privacy !== 'private' ||
        url.protocol !== 'https:' ||
        !url.hostname.endsWith('.daily.co')
      ) {
        throw new Error('VIDEO_INVALID_ROOM')
      }
      const { start, end } = videoWindow(appointment)
      const { token } = await request('/meeting-tokens', {
        properties: {
          room_name: name,
          user_id: uid,
          user_name: String(
            uid === appointment.coachId
              ? appointment.coachName || 'Coach'
              : appointment.clientName || 'Apprenant',
          ).slice(0, 100),
          is_owner: false,
          nbf: Math.floor(start / 1000),
          exp: Math.min(
            Math.floor(end / 1000),
            Math.floor(Date.now() / 1000) + 120,
          ),
        },
      })
      if (!token) throw new Error('VIDEO_INVALID_TOKEN')
      return { url: url.href, token, sessionVersion: name }
    },
  }
}
