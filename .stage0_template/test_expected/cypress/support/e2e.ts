// Cypress E2E support file — auth via spa_utils (JWT + localStorage, no login UI).

import { registerAuthCommands } from '@agile-learning-institute/star_spa_utils/cypress/registerAuthCommands'

registerAuthCommands({ visitPath: '/' })

export {}