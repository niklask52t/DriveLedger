import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './contexts/I18nContext'
import { UserConfigProvider } from './contexts/UserConfigContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <UserConfigProvider>
          <App />
        </UserConfigProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
