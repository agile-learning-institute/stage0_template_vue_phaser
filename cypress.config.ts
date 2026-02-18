import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:{{repo.port}}',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'node_modules/@{{org.git_org}}/{{info.slug}}_spa_utils/cypress/e2e/pages/login-app.cy.ts',
      'node_modules/@{{org.git_org}}/{{info.slug}}_spa_utils/cypress/e2e/pages/admin-app.cy.ts',
    ],
    video: false,
    screenshotOnRunFailure: true,
  },
})
