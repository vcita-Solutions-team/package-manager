<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4" xl="3">
        <v-card class="pa-4" elevation="8" rounded="lg">
          <v-card-title class="text-h5 font-weight-bold pb-2">
            Package Configuration Manager
          </v-card-title>
          <v-card-subtitle class="pb-4">
            Sign in with your operator credentials
          </v-card-subtitle>

          <v-card-text>
            <v-select
              v-model="selectedEnv"
              :items="envOptions"
              item-title="label"
              item-value="value"
              label="Environment"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              :color="selectedEnv === 'production' ? '#131a46' : '#fab4cd'"
              @update:model-value="onEnvChange"
            />

            <v-alert
              v-if="selectedEnv === 'production'"
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-6"
            >
              You are connecting to <strong>Production</strong>
            </v-alert>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              closable
              class="mb-4"
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>

            <!-- Login form -->
            <v-form
              v-if="formMode === 'login'"
              ref="loginFormRef"
              v-model="loginValid"
              @submit.prevent="onLogin"
            >
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                :rules="emailRules"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                autofocus
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                :rules="passwordRules"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                autocomplete="off"
              />
              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                :disabled="!loginValid"
              >
                Sign in
              </v-btn>
            </v-form>

            <!-- MFA form -->
            <v-form
              v-if="formMode === 'mfa'"
              ref="mfaFormRef"
              v-model="mfaValid"
              @submit.prevent="onMfaSubmit"
            >
              <p class="text-body-2 mb-4">
                A verification code was sent to {{ mfaSentVia }}: {{ mfaSentTo }}.
                Enter the 6-digit code below.
              </p>
              <v-text-field
                v-model="mfaCode"
                label="Verification code"
                maxlength="6"
                :rules="mfaCodeRules"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                autofocus
              />
              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                :disabled="!mfaValid"
              >
                Verify
              </v-btn>
              <v-btn
                variant="text"
                size="small"
                class="mt-2"
                block
                @click="resetToLogin"
              >
                Back to login
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ENVIRONMENTS } from '@/api/client'
import type { AppEnvironment } from '@/api/client'
import { useReCaptcha } from 'vue-recaptcha-v3'

const router = useRouter()
const authStore = useAuthStore()
const { executeRecaptcha, recaptchaLoaded } = useReCaptcha()!

const envOptions = Object.entries(ENVIRONMENTS).map(([value, { label }]) => ({ value, label }))
const selectedEnv = ref<AppEnvironment>(authStore.environment)

function onEnvChange(env: AppEnvironment) {
  authStore.switchEnvironment(env)
  errorMessage.value = ''
}

async function getCaptchaToken(): Promise<string | null> {
  if (selectedEnv.value !== 'production') return null
  await recaptchaLoaded()
  return await executeRecaptcha('login')
}

const formMode = ref<'login' | 'mfa'>('login')
const loading = ref(false)
const errorMessage = ref('')

const email = ref('ofra+snow@vmeetme.com')
const password = ref('')
const loginValid = ref(false)
const loginFormRef = ref()

const mfaCode = ref('')
const mfaValid = ref(false)
const mfaFormRef = ref()
const mfaSentVia = ref('')
const mfaSentTo = ref('')

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Enter a valid email',
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
]

const mfaCodeRules = [
  (v: string) => !!v || 'Code is required',
  (v: string) => /^\d{6}$/.test(v) || 'Enter a 6-digit code',
]

onMounted(async () => {
  if (authStore.isAuthenticated) {
    const valid = await authStore.validateToken()
    if (valid) {
      router.replace('/')
    }
  }
})

async function onLogin() {
  if (!loginValid.value) return
  loading.value = true
  errorMessage.value = ''

  const captchaToken = await getCaptchaToken()
  const result = await authStore.login(email.value, password.value, captchaToken)

  if (result.success) {
    await authStore.fetchOperator()
    router.replace('/')
  } else if (result.mfa) {
    formMode.value = 'mfa'
    if (result.mfaData) {
      mfaSentVia.value = result.mfaData.sent_via || 'email'
      mfaSentTo.value = result.mfaData.sent_to || ''
    }
  } else {
    errorMessage.value = result.error || 'Login failed'
  }

  loading.value = false
}

async function onMfaSubmit() {
  if (!mfaValid.value) return
  loading.value = true
  errorMessage.value = ''

  const result = await authStore.submitMfaCode(mfaCode.value)

  if (result.success) {
    await authStore.fetchOperator()
    router.replace('/')
  } else {
    errorMessage.value = result.error || 'Verification failed'
  }

  loading.value = false
}

function resetToLogin() {
  formMode.value = 'login'
  mfaCode.value = ''
  errorMessage.value = ''
  authStore.clearToken()
}
</script>
