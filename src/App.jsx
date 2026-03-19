import { BrowserRouter } from 'react-router-dom'
import { GRIPProvider } from './context/GRIPContext'
import { AppShell } from './layouts/AppShell'

function App() {
  return (
    <BrowserRouter>
      <GRIPProvider>
        <AppShell />
      </GRIPProvider>
    </BrowserRouter>
  )
}

export default App
