import { BrowserRouter } from 'react-router-dom'
import AppRoutes from '../routes/AppRoutes.jsx'

// BrowserRouter lives here so Phase 2 context providers can wrap
// AppRoutes inside the router without touching main.jsx
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
