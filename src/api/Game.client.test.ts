import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api, ApiError } from './client'
import type { GameInput, GameUpdate } from './types'

const mockFetch = vi.fn()
global.fetch = mockFetch

const breadcrumb = {
  from_ip: '127.0.0.1',
  by_user: 'user1',
  at_time: '2024-01-01T00:00:00Z',
  correlation_id: 'corr-123'
}

describe('API Client - Game Endpoints', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
    localStorage.setItem('access_token', 'test-token')
  })

  it('should get all games', async () => {
    const mockGames = [
      { _id: '507f1f77bcf86cd799439011', name: 'test-game', status: 'active' as const, created: breadcrumb, saved: breadcrumb }
    ]
    const mockResponse = { items: mockGames, limit: 20, has_more: false, next_cursor: null }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-length' ? '100' : null },
      json: async () => mockResponse
    })

    const result = await api.getGames()
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/game', expect.any(Object))
  })

  it('should get games with name query (placeholder "my game" uses name=user_id)', async () => {
    const mockResponse = { items: [], limit: 50, has_more: false, next_cursor: null }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-length' ? '100' : null },
      json: async () => mockResponse
    })

    await api.getGames({ name: 'user-123', limit: 50, sort_by: 'created.at_time', order: 'desc' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/game?name=user-123&limit=50&sort_by=created.at_time&order=desc',
      expect.any(Object)
    )
  })

  it('should get a single game by id', async () => {
    const mockGame = { _id: '507f1f77bcf86cd799439011', name: 'test-game', status: 'active' as const, created: breadcrumb, saved: breadcrumb }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-length' ? '100' : null },
      json: async () => mockGame
    })

    const result = await api.getGame('507f1f77bcf86cd799439011')
    expect(result).toEqual(mockGame)
    expect(mockFetch).toHaveBeenCalledWith('/api/game/507f1f77bcf86cd799439011', expect.any(Object))
  })

  it('should create a game', async () => {
    const input: GameInput = { name: 'new-game', description: 'New', status: 'active' }
    const mockResponse = { _id: '507f1f77bcf86cd799439011' }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: (name: string) => name === 'content-length' ? '100' : null },
      json: async () => mockResponse
    })

    const result = await api.createGame(input)
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/game',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) })
    )
  })

  it('should update a game', async () => {
    const update: GameUpdate = { name: 'updated-name' }
    const mockGame = { _id: '507f1f77bcf86cd799439011', name: 'updated-name', status: 'active' as const, created: breadcrumb, saved: breadcrumb }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-length' ? '100' : null },
      json: async () => mockGame
    })

    const result = await api.updateGame('507f1f77bcf86cd799439011', update)
    expect(result).toEqual(mockGame)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/game/507f1f77bcf86cd799439011',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(update) })
    )
  })

  it('should handle 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Resource not found' })
    })
    await expect(api.getGame('invalid-id')).rejects.toThrow(ApiError)
  })

  it('should handle 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Unauthorized' })
    })
    await expect(api.getGames()).rejects.toThrow('Unauthorized')
  })
})
