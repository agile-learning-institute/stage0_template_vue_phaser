import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api, ApiError } from './client'
import type { ControlInput, ControlUpdate, CreateInput } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_at: '2026-12-31T23:59:59Z',
        subject: 'test-user',
        roles: ['admin']
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await api.devLogin({ subject: 'test-user', roles: ['admin'] })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        '/dev-login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ subject: 'test-user', roles: ['admin'] })
        })
      )
    })

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid credentials' })
      })

      await expect(api.devLogin()).rejects.toThrow('Invalid credentials')
    })
  })

  describe('Config', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token')
    })

    it('should fetch config successfully', async () => {
      const mockConfig = {
        config_items: [],
        versions: [],
        enumerators: [],
        token: { claims: {} }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockConfig
      })

      const result = await api.getConfig()

      expect(result).toEqual(mockConfig)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/config',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })
  })

  describe('401 Unauthorized Handling', () => {
    let originalLocation: Location
    let mockLocation: Partial<Location>

    beforeEach(() => {
      localStorage.setItem('access_token', 'invalid-token')
      localStorage.setItem('token_expires_at', '2026-12-31T23:59:59Z')
      originalLocation = window.location
      mockLocation = { href: '', pathname: '/controls' }
      delete (window as any).location
      window.location = mockLocation as Location
    })

    afterEach(() => {
      window.location = originalLocation
    })

    it('should clear tokens and redirect on 401 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid token' })
      })

      try {
        await api.getConfig()
      } catch (error) {
        // Error is expected to be thrown
      }

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('token_expires_at')).toBeNull()
      expect(mockLocation.href).toBe('/login?redirect=%2Fcontrols')
    })
  })

  describe('Control Endpoints', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token')
    })

    it('should get all controls', async () => {
      const mockControls = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'test-control',
          description: 'Test description',
          status: 'active' as const,
          created: {
            from_ip: '127.0.0.1',
            by_user: 'user1',
            at_time: '2024-01-01T00:00:00Z',
            correlation_id: 'corr-123'
          },
          saved: {
            from_ip: '127.0.0.1',
            by_user: 'user1',
            at_time: '2024-01-01T00:00:00Z',
            correlation_id: 'corr-123'
          }
        }
      ]

      const mockResponse = {
        items: mockControls,
        limit: 20,
        has_more: false,
        next_cursor: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      const result = await api.getControls()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith('/api/control', expect.any(Object))
    })

    it('should get controls with name query', async () => {
      const mockResponse = {
        items: [],
        limit: 20,
        has_more: false,
        next_cursor: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      await api.getControls({ name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/control?name=test',
        expect.any(Object)
      )
    })

    it('should get a single control', async () => {
      const mockControl = {
        _id: '507f1f77bcf86cd799439011',
        name: 'test-control',
        status: 'active' as const,
        created: {
          from_ip: '127.0.0.1',
          by_user: 'user1',
          at_time: '2024-01-01T00:00:00Z',
          correlation_id: 'corr-123'
        },
        saved: {
          from_ip: '127.0.0.1',
          by_user: 'user1',
          at_time: '2024-01-01T00:00:00Z',
          correlation_id: 'corr-123'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockControl
      })

      const result = await api.getControl('507f1f77bcf86cd799439011')

      expect(result).toEqual(mockControl)
    })

    it('should create a control', async () => {
      const input: ControlInput = {
        name: 'new-control',
        description: 'New description',
        status: 'active'
      }

      const mockResponse = { _id: '507f1f77bcf86cd799439011' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      const result = await api.createControl(input)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/control',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input)
        })
      )
    })

    it('should update a control', async () => {
      const update: ControlUpdate = {
        name: 'updated-name'
      }

      const mockControl = {
        _id: '507f1f77bcf86cd799439011',
        name: 'updated-name',
        status: 'active' as const,
        created: {
          from_ip: '127.0.0.1',
          by_user: 'user1',
          at_time: '2024-01-01T00:00:00Z',
          correlation_id: 'corr-123'
        },
        saved: {
          from_ip: '127.0.0.1',
          by_user: 'user1',
          at_time: '2024-01-01T00:00:00Z',
          correlation_id: 'corr-123'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockControl
      })

      const result = await api.updateControl('507f1f77bcf86cd799439011', update)

      expect(result).toEqual(mockControl)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/control/507f1f77bcf86cd799439011',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(update)
        })
      )
    })
  })

  describe('Create Endpoints', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token')
    })

    it('should get all creates', async () => {
      const mockCreates = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'test-create',
          description: 'Test description',
          status: 'active',
          created: {
            from_ip: '127.0.0.1',
            by_user: 'user1',
            at_time: '2024-01-01T00:00:00Z',
            correlation_id: 'corr-123'
          }
        }
      ]

      const mockResponse = {
        items: mockCreates,
        limit: 20,
        has_more: false,
        next_cursor: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      const result = await api.getCreates()

      expect(result).toEqual(mockResponse)
    })

    it('should get a single create', async () => {
      const mockCreate = {
        _id: '507f1f77bcf86cd799439011',
        name: 'test-create',
        created: {
          from_ip: '127.0.0.1',
          by_user: 'user1',
          at_time: '2024-01-01T00:00:00Z',
          correlation_id: 'corr-123'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockCreate
      })

      const result = await api.getCreate('507f1f77bcf86cd799439011')

      expect(result).toEqual(mockCreate)
    })

    it('should create a create', async () => {
      const input: CreateInput = {
        name: 'new-create',
        description: 'New description',
        status: 'active'
      }

      const mockResponse = { _id: '507f1f77bcf86cd799439011' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      const result = await api.createCreate(input)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input)
        })
      )
    })
  })

  describe('Consume Endpoints', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token')
    })

    it('should get all consumes', async () => {
      const mockConsumes = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'test-consume',
          description: 'Test description',
          status: 'active'
        }
      ]

      const mockResponse = {
        items: mockConsumes,
        limit: 20,
        has_more: false,
        next_cursor: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      const result = await api.getConsumes()

      expect(result).toEqual(mockResponse)
    })

    it('should get consumes with name query', async () => {
      const mockResponse = {
        items: [],
        limit: 20,
        has_more: false,
        next_cursor: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockResponse
      })

      await api.getConsumes({ name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/consume?name=test',
        expect.any(Object)
      )
    })

    it('should get a single consume', async () => {
      const mockConsume = {
        _id: '507f1f77bcf86cd799439011',
        name: 'test-consume'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-length' ? '100' : null
        },
        json: async () => mockConsume
      })

      const result = await api.getConsume('507f1f77bcf86cd799439011')

      expect(result).toEqual(mockConsume)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token')
    })

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' })
      })

      await expect(api.getControl('invalid-id')).rejects.toThrow(ApiError)
    })

    it('should handle 401 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' })
      })

      await expect(api.getControls()).rejects.toThrow('Unauthorized')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getControls()).rejects.toThrow('Network error')
    })
  })
})
