import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './assets/styles/main.css'
import router from './router'
import { useSessionStore } from './stores/session'
import { useThemeStore } from './stores/theme'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Init de stores globales antes de montar: el preflight de index.html ya aplico
// el tema guardado al <html>, esto sincroniza el store de Pinia + carga usuarios
// (paridad con KF.store.init() / theme.js init() del index.html viejo).
const theme = useThemeStore()
theme.init()

const session = useSessionStore()
void session.init()

app.mount('#app')
