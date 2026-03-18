import type {
  Game,
  GameInput,
  GameUpdate,
  Event,
  EventInput,
  Player,
  DevLoginRequest,
  DevLoginResponse,
  ConfigResponse,
  Error,
  InfiniteScrollParams,
  InfiniteScrollResponse
} from './types'

const API_BASE = '/api'

function getDevLoginUrl(): string {
  return '/dev-login'
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Error
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorData: Error | null = null
    try {
      errorData = await response.json()
    } catch {
      // Ignore JSON parse errors
    }

    // Handle 401 Unauthorized - clear invalid token and redirect to login
    if (response.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('token_expires_at')
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }

    throw new ApiError(
      errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData || undefined
    )
  }

  // Handle empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  return response.json()
}

export const api = {
  // Authentication
  async devLogin(payload?: DevLoginRequest): Promise<DevLoginResponse> {
    const url = getDevLoginUrl()
    const token = localStorage.getItem('access_token')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
    })

    if (!response.ok) {
      let errorData: Error | null = null
      try {
        errorData = await response.json()
      } catch {
        // Ignore JSON parse errors
      }
      throw new ApiError(
        errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData || undefined
      )
    }

    return response.json()
  },

  // Config (playerId = config.token.user_id)
  async getConfig(): Promise<ConfigResponse> {
    return request<ConfigResponse>('/config')
  },

  // Game endpoints
  // Placeholder "my game" flow: GET /game?name={user_id} and pick latest from items (sort by created if needed)
  async getGames(params?: InfiniteScrollParams): Promise<InfiniteScrollResponse<Game>> {
    const queryParams = new URLSearchParams()
    if (params?.name) queryParams.append('name', params.name)
    if (params?.after_id) queryParams.append('after_id', params.after_id)
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.order) queryParams.append('order', params.order)

    const query = queryParams.toString()
    return request<InfiniteScrollResponse<Game>>(`/game${query ? `?${query}` : ''}`)
  },

  /** Get a specific game by id (e.g. /play/:game_id or after update) */
  async getGame(gameId: string): Promise<Game> {
    return request<Game>(`/game/${gameId}`)
  },

  async createGame(data: GameInput): Promise<{ _id: string }> {
    return request<{ _id: string }>('/game', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateGame(gameId: string, data: GameUpdate): Promise<Game> {
    return request<Game>(`/game/${gameId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Event endpoints (fine-grained: name = one-word slug, e.g. move, jump)
  async getEvents(params?: InfiniteScrollParams): Promise<InfiniteScrollResponse<Event>> {
    const queryParams = new URLSearchParams()
    if (params?.name) queryParams.append('name', params.name)
    if (params?.after_id) queryParams.append('after_id', params.after_id)
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.order) queryParams.append('order', params.order)

    const query = queryParams.toString()
    return request<InfiniteScrollResponse<Event>>(`/event${query ? `?${query}` : ''}`)
  },

  async getEvent(eventId: string): Promise<Event> {
    return request<Event>(`/event/${eventId}`)
  },

  async createEvent(data: EventInput): Promise<{ _id: string }> {
    return request<{ _id: string }>('/event', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Player endpoints
  async getPlayers(params?: InfiniteScrollParams): Promise<InfiniteScrollResponse<Player>> {
    const queryParams = new URLSearchParams()
    if (params?.name) queryParams.append('name', params.name)
    if (params?.after_id) queryParams.append('after_id', params.after_id)
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.order) queryParams.append('order', params.order)

    const query = queryParams.toString()
    return request<InfiniteScrollResponse<Player>>(`/player${query ? `?${query}` : ''}`)
  },

  async getPlayer(playerId: string): Promise<Player> {
    return request<Player>(`/player/${playerId}`)
  },
}

export { ApiError }
