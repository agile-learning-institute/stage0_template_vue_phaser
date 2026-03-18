<template>
  <div class="game-page-wrapper">
    <div ref="gameContainer" class="game-page" data-automation-id="game-container" />
    <div v-if="error" class="game-overlay error">
      <p>{{ error }}</p>
      <v-btn size="small" @click="loadAndStart">Retry</v-btn>
    </div>
    <div v-else-if="loading" class="game-overlay loading">
      <p>Loading...</p>
    </div>
    <div v-else-if="player || game" class="game-overlay info">
      <span v-if="player">{{ player.name }}</span>
      <span v-if="game?.description">{{ game.description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { createGame } from '@/game/bootstrap'
import { api } from '@/api/client'
import type Phaser from 'phaser'
import type { Game, Player } from '@/api/types'
import type { GameApiContext } from '@/game/apiContext'

const route = useRoute()
const gameContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const player = ref<Player | null>(null)
const game = ref<Game | null>(null)
const gameIdRef = ref<string | null>(null)

let gameInstance: Phaser.Game | null = null

async function loadInitialData() {
  error.value = null
  loading.value = true
  try {
    const configRes = await api.getConfig()
    const claims = configRes.token?.claims as Record<string, unknown> | undefined
    const pid = (claims?.user_id as string) ?? (claims?.sub as string)
    if (!pid) {
      error.value = 'Missing player id in config'
      loading.value = false
      return
    }

    let gameRes: Game
    const gameIdFromRoute = route.params.game_id as string | undefined
    if (gameIdFromRoute) {
      gameRes = await api.getGame(gameIdFromRoute)
    } else {
      const list = await api.getGames({
        name: pid,
        limit: 50,
        sort_by: 'created.at_time',
        order: 'desc'
      })
      const latest = list.items?.[0]
      if (!latest) {
        error.value = 'No game found'
        loading.value = false
        return
      }
      gameRes = latest
    }

    gameIdRef.value = gameRes._id
    game.value = gameRes

    const playerRes = await api.getPlayer(pid)
    player.value = playerRes

    loading.value = false
    return { playerId: pid, gameId: gameRes._id, player: playerRes, game: gameRes }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
    loading.value = false
  }
}

function buildApiContext(
  playerId: string,
  gameId: string,
  playerData: Player,
  gameData: Game
): GameApiContext {
  return {
    playerId,
    gameId,
    player: playerData,
    game: gameData,
    recordEvent: async (payload) => {
      await api.createEvent(payload)
    },
    updateGameProgress: async (patch) => {
      await api.updateGame(gameId, patch)
      const updated = await api.getGame(gameId)
      game.value = updated
    }
  }
}

async function loadAndStart() {
  const data = await loadInitialData()
  if (!data || !gameContainer.value) return

  const ctx = buildApiContext(
    data.playerId,
    data.gameId,
    data.player,
    data.game
  )
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
  gameInstance = createGame(gameContainer.value, ctx)
}

onMounted(() => {
  loadAndStart()
})

onUnmounted(() => {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
})
</script>

<style scoped>
.game-page-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: #2d2d2d;
}

.game-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  padding: 8px;
  border-radius: 4px;
  z-index: 10;
  pointer-events: none;
}

.game-overlay.info {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  display: flex;
  gap: 16px;
}

.game-overlay.loading {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.game-overlay.error {
  background: rgba(180, 0, 0, 0.8);
  color: #fff;
  pointer-events: auto;
}
</style>
