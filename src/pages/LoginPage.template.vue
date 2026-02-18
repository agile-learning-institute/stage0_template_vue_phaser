<template>
  <LoginPage
    :login-fn="loginFn"
    :default-redirect="defaultRedirect"
  />
</template>

<script setup lang="ts">
import { LoginPage } from '@{{org.git_org}}/{{info.slug}}_spa_utils'
import { useAuth } from '@/composables/useAuth'

const { login } = useAuth()

async function loginFn(subject?: string, roles?: string[]) {
  await login(subject, roles)
}

// Default redirect to first control domain list
const defaultRedirect = '/{{ service.data_domains.controls[0] | lower }}s'
</script>
