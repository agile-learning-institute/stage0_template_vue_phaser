import { test, expect } from '@playwright/test'

const mockConfig = {
  config_items: [],
  versions: [],
  enumerators: [],
  token: { claims: { user_id: 'test-player-id', sub: 'test-player-id' } }
}

const mockGame = {
  _id: 'game-1',
  name: 'Test Game',
  description: 'Clicks: 0',
  status: 'active',
  created: { from_ip: '127.0.0.1', by_user: 'test', at_time: new Date().toISOString(), correlation_id: 'c1' },
  saved: { from_ip: '127.0.0.1', by_user: 'test', at_time: new Date().toISOString(), correlation_id: 'c1' }
}

const mockPlayer = {
  _id: 'test-player-id',
  name: 'Test Player',
  description: '',
  status: 'active'
}

test.describe('Game screen', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/play')
    await expect(page).toHaveURL(/\/login/)
  })

  test('game loads: container and canvas visible when API returns data', async ({ page }) => {
    const gameListResponse = { items: [mockGame], limit: 50, has_more: false, next_cursor: null }

    await page.route('**/api/config', (route) => route.fulfill({ status: 200, body: JSON.stringify(mockConfig) }))
    await page.route('**/api/game**', (route) => {
      const url = route.request().url()
      const body = url.match(/\/api\/game\/[^/]+$/) ? mockGame : gameListResponse
      return route.fulfill({ status: 200, body: JSON.stringify(body) })
    })
    await page.route('**/api/player/**', (route) => route.fulfill({ status: 200, body: JSON.stringify(mockPlayer) }))

    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('token_expires_at', '2099-01-01T00:00:00Z')
      localStorage.setItem('user_roles', JSON.stringify(['user']))
    })
    await page.goto('/play')
    await expect(page).toHaveURL(/\/play/)

    const container = page.locator('[data-automation-id="game-container"]')
    await expect(container).toBeVisible({ timeout: 5000 })

    const canvas = container.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })
})
