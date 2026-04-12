import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './styles.css'

import { VueReCaptcha } from 'vue-recaptcha-v3'
import App from './App.vue'
import router from './router'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#131a46',
          secondary: '#d1b050',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(VueReCaptcha, {
  siteKey: '6Lf8ePMZAAAAAE54edpwoRp9M4tskUuwbm6DfIJN',
  loaderOptions: { autoHideBadge: true },
})
app.mount('#app')
