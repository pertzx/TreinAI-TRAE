import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Menu from './components/Menu.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { debugCookies } from './utils/debugCookies.js'

// Debug de cookies em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🔍 Iniciando debug de cookies...');
  debugCookies.listAll();
  debugCookies.checkAuthToken();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
