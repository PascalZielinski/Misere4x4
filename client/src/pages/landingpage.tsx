import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import './landingpage.css'
import NavBar from '../components/NavBar'

const SERVER = import.meta.env.VITE_SERVER as string | undefined

async function pingServer(): Promise<boolean> {
  if (!SERVER) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    await fetch(`${SERVER}/health`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [serverDown, setServerDown] = useState(false)

  const goOnline = async () => {
    setChecking(true)
    setServerDown(false)
    const ok = await pingServer()
    setChecking(false)
    if (ok) navigate('/online')
    else setServerDown(true)
  }

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="landing-buttons">
          <Link to="/local" className="landing-btn landing-btn--primary">
            Lokal spielen
          </Link>
          <button className="landing-btn" onClick={goOnline} disabled={checking}>
            {checking ? 'Prüfe Server…' : 'Online spielen'}
          </button>
        </div>
        {serverDown && (
          <p className="landing-error" role="alert">
            Server aktuell nicht verfügbar
          </p>
        )}
      </main>
    </div>
  )
}