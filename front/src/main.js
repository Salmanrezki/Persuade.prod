import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

import router from './router'
import { createPinia } from 'pinia'

import vuetify from './plugins/vuetify'

// ⚠️ créer l’app d’abord
const app = createApp(App)

// plugins
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(vuetify)

// init auth APRÈS pinia
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
authStore.init()

// mount
app.mount('#app')
