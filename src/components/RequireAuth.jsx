import { Navigate } from 'react-router-dom'
import { useGRIP } from '../context/GRIPContext'

export default function RequireAuth({ children }) {
  const { registrationResult } = useGRIP()

  if (!registrationResult) {
    return <Navigate to="/login" replace />
  }

  return children
}
