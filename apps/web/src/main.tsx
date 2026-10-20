import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* WEB-12: safety layer only — Framer honours the OS for elements as they
          mount. Live OS changes and the account choice are handled explicitly
          (contexts/motionPreferenceContext.ts, components/common/Entrance.tsx). */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <AuthProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </AuthProvider>
        </TooltipProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
