import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import { watchInstallPrompt } from './lib/install'
import App from './App'
import './index.css'

/* Chrome fires `beforeinstallprompt` once, as soon as the app qualifies —
   often before React has mounted. Start watching first so the guest's
   "Get 10% off" tap has a real prompt to hand back. */
watchInstallPrompt()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
