import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './Onlinepage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'

const USER_TOKEN_KEY = 'token'
const SERVER = import.meta.env.DEV ? '' : (import.meta.env.VITE_SERVER as string | undefined)

type IdentityState = {
  status: 'checking' | 'missing' | 'creating' | 'authenticated' | 'error'
  token: string
  name?: string
  message?: string
  error?: 'invalidToken' | 'serverError' | 'createError'
}

type LeaderboardUser = {
  name: string
  score: number
  createdAt: string | null
  active: boolean
}

function initialIdentity(): IdentityState {
  const token = sessionStorage.getItem(USER_TOKEN_KEY) ?? ''
  return { status: token ? 'checking' : 'missing', token }
}

export default function OnlinePage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<IdentityState>(initialIdentity)
  const [nickname, setNickname] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [leaderboardError, setLeaderboardError] = useState(false)
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadLeaderboard = async () => {
      try {
        if (!import.meta.env.DEV && !SERVER) {
          throw new Error('VITE_SERVER is not configured.')
        }

        const response = await fetch(`${SERVER}/api/users`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Leaderboard request failed with status ${response.status}.`)
        }

        const users: unknown = await response.json()
        if (
          !Array.isArray(users) ||
          !users.every(
            (user): user is LeaderboardUser =>
              typeof user?.name === 'string' &&
              typeof user?.score === 'number' &&
              (user?.createdAt === null || typeof user?.createdAt === 'string') &&
              typeof user?.active === 'boolean',
          )
        ) {
          throw new Error('Leaderboard response has an invalid shape.')
        }

        setLeaderboard(users)
        setLeaderboardLoaded(true)
        setLeaderboardError(false)
      } catch {
        if (!controller.signal.aborted) setLeaderboardError(true)
      }
    }

    void loadLeaderboard()
    const intervalId = window.setInterval(() => void loadLeaderboard(), 5000)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (identity.status !== 'checking' || !identity.token) return

    const controller = new AbortController()
    const verifyToken = async () => {
      let currentToken = identity.token
      try {
        if (!import.meta.env.DEV && !SERVER) {
          throw new Error('VITE_SERVER is not configured.')
        }

        const response = await fetch(`${SERVER}/api/users/me`, {
          headers: { Authorization: `Bearer ${identity.token}` },
          signal: controller.signal,
        })

        currentToken = response.headers.get('X-User-Token') || currentToken
        sessionStorage.setItem(USER_TOKEN_KEY, currentToken)

        if (response.status === 401) {
          sessionStorage.removeItem(USER_TOKEN_KEY)
          setIdentity({ status: 'missing', token: currentToken, error: 'invalidToken' })
          return
        }
        if (!response.ok) throw new Error(`User lookup failed with status ${response.status}.`)

        const user: { name?: unknown } = await response.json()
        if (typeof user.name !== 'string' || user.name.length === 0) {
          throw new Error('User lookup returned an invalid response.')
        }

        setIdentity({ status: 'authenticated', token: currentToken, name: user.name })
      } catch {
        if (controller.signal.aborted) return
        currentToken = sessionStorage.getItem(USER_TOKEN_KEY) ?? currentToken
        setIdentity({ status: 'error', token: currentToken, error: 'serverError' })
      }
    }

    void verifyToken()
    return () => controller.abort()
  }, [identity.status, identity.token])

  const submitNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = nickname.trim()
    if (!name || (!import.meta.env.DEV && !SERVER)) {
      setIdentity({ ...identity, status: 'missing', error: 'createError' })
      return
    }

    setIdentity({ ...identity, status: 'creating', error: undefined })
    try {
      const response = await fetch(`${SERVER}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        let message = `User creation failed with status ${response.status}.`
        if (contentType.includes('application/json')) {
          const errorResponse: { error?: unknown } = await response.json()
          if (typeof errorResponse.error === 'string') message = errorResponse.error
        }
        throw new Error(message)
      }

      const user: { name?: unknown; token?: unknown } = await response.json()
      if (typeof user.name !== 'string' || typeof user.token !== 'string' || !user.token) {
        throw new Error('User creation returned an invalid response.')
      }

      sessionStorage.setItem(USER_TOKEN_KEY, user.token)
      setIdentity({ status: 'authenticated', token: user.token, name: user.name })
    } catch (error) {
      setIdentity({
        ...identity,
        status: 'missing',
        error: 'createError',
        message: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className="landing online-page">
      <NavBar />

      <main className="online-layout">
        <section className="online-main">
          {identity.status === 'authenticated' && (
            <section className="online-user-panel" aria-live="polite">
              <p>{t('online.signedInAs', { name: identity.name })}</p>
            </section>
          )}
          {identity.status === 'error' && (
            <p className="online-token-error" role="alert">
              {t(`online.${identity.error}`)}
            </p>
          )}

          <div className="landing-buttons">
            <button
              className="landing-btn landing-btn--primary"
              onClick={() => navigate(`/${lang}/online/queue`)}
            >
              {t('online.queue')}
            </button>
            <button
              className="landing-btn"
              onClick={() => navigate(`/${lang}/online/private`)}
            >
              {t('online.privateGame')}
            </button>
          </div>

        </section>

        <aside className="lb-panel" aria-labelledby="online-leaderboard-title">
          <header className="lb-title">
            <h1 id="online-leaderboard-title">{t('online.leaderboardTitle')}</h1>
          </header>

          <div className="lb-body">
            {leaderboardError && (
              <p className="online-leaderboard-error" role="alert">
                {t('online.leaderboardError')}
              </p>
            )}

            {leaderboardLoaded && leaderboard.length === 0 && (
              <p className="online-leaderboard-empty">{t('online.leaderboardEmpty')}</p>
            )}

            {leaderboard.length > 0 && (
              <table className="lb-table">
                <colgroup>
                  <col />
                  <col className="lb-col-score" />
                  <col className="lb-col-active" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">{t('online.colName', 'Name')}</th>
                    <th scope="col" className="lb-th-score">{t('online.colScore', 'Score')}</th>
                    <th scope="col" className="lb-th-active">{t('online.colActive', 'Active')}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => (
                    <tr
                      key={`${user.name}-${user.createdAt ?? index}`}
                      className={user.name === identity.name ? 'is-me' : undefined}
                    >
                      <td className="lb-name" title={user.name}>{user.name}</td>
                      <td className="lb-score">{user.score}</td>
                      <td className="lb-status">
                        <span
                          className={`lb-dot${user.active ? ' is-active' : ''}`}
                          role="img"
                          aria-label={user.active ? t('online.activeUser') : t('online.inactiveUser')}
                          title={user.active ? t('online.activeUser') : t('online.inactiveUser')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </aside>
      </main>

      {(identity.status === 'missing' || identity.status === 'creating') && (
        <div className="online-identity-overlay">
          <section
            className="online-user-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="online-user-nickname-label"
            aria-live="polite"
          >
            {identity.status === 'creating' ? (
              <p>{t('online.creatingUser')}</p>
            ) : (
              <form className="online-token-form" onSubmit={submitNickname}>
                <label id="online-user-nickname-label" htmlFor="online-user-nickname">
                  {t('online.nicknameLabel')}
                </label>
                <input
                  id="online-user-nickname"
                  type="text"
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  autoFocus
                />
                {identity.error && (
                  <p className="online-token-error" role="alert">
                    {identity.message ?? t(`online.${identity.error}`)}
                  </p>
                )}
                <button
                  className="landing-btn landing-btn--primary"
                  type="submit"
                  disabled={!nickname.trim()}
                >
                  {t('online.createUser')}
                </button>
                <LocalizedLink to="/" className="landing-btn landing-btn--ghost">
                  {t('online.backToHome')}
                </LocalizedLink>
              </form>
            )}
          </section>
        </div>
      )}

      <footer className="site-footer">
        <div className="site-footer__item site-footer__item--license">
          <LocalizedLink to="/licenses" className="footer-link">
            {t('landing.licensesCredits')}
          </LocalizedLink>
        </div>
        <div className="site-footer__item site-footer__item--admin">
          <LocalizedLink to="/admin" className="footer-link">
            {t('landing.admin')}
          </LocalizedLink>
        </div>
      </footer>
    </div>
  )
}