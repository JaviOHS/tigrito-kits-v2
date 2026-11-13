import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from './composables/useTheme'
import './assets/styles/main.css'

initTheme()

createApp(App).mount('#app')
