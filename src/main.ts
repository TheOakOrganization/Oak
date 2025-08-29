import { createApp } from 'vue'
import App from './App.vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

import { type ThemeDefinition } from 'vuetify'

const oakLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#8BC34A',
    'primary-darken-1': '#7CB342',
    secondary: '#4CAF50',
    'secondary-darken-1': '#43A047',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  },
}

const oakDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#212121',
    primary: '#4CAF50',
    'primary-darken-1': '#43A047',
    secondary: '#8BC34A',
    'secondary-darken-1': '#7CB342',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  },
}

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'oakLightTheme',
    themes: {
      oakLightTheme,
      oakDarkTheme,
    },
  },
})

createApp(App).use(vuetify).mount('#app')
