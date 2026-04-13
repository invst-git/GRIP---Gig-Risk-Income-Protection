import { BrowserRouter } from 'react-router-dom'
import { GRIPProvider } from './context/GRIPContext'
import { NotificationProvider } from './context/NotificationContext'
import { AppShell } from './layouts/AppShell'

function App() {
  return (
    <BrowserRouter>
      <GRIPProvider>
        <NotificationProvider>
          <AppShell />
        </NotificationProvider>
      </GRIPProvider>
    </BrowserRouter>
  )
}

export default App
