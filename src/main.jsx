import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initErrorReporter } from './lib/errorReporter.js'
import App from './App.jsx'

initErrorReporter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
