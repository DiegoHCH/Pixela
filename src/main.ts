import { mount } from 'svelte'

import './styles/base.css'
import { theme } from './state/theme.svelte'
import App from './ui/App.svelte'

theme.start()

const target = document.getElementById('app')
if (!target) throw new Error('No está el contenedor #app.')

export default mount(App, { target })
