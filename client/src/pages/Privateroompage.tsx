//#region Imports
// MARK: - Imports
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './Privateroompage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import { createRoom, joinRoom, PrivateRoomApiError } from '../api/privateRooms'
//#endregion

//#region Private room configuration
// MARK: - Private room configuration
const CODE_LENGTH = 6
const LEGACY_CODE_LENGTH = 4

type JoinError = 'invalid' | 'notFound' | 'unauthorized' | 'generic' | null
type Busy = 'creating' | 'joining' | null
//#endregion

//#region Private room page
// MARK: - Private room page
export default function PrivateRoomPage() {
  //#region Form state
  // MARK: Form state
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [focused, setFocused] = useState(false)
  const [joinError, setJoinError] = useState<JoinError>(null)
  const [createFailed, setCreateFailed] = useState<'unauthorized' | 'generic' | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  //#endregion

  //#region Room actions
  // MARK: Room actions
  const onCreateRoom = async () => {
    if (busy) return
    setBusy('creating')
    setCreateFailed(null)
    try {
      const room = await createRoom()
      navigate(`/${lang}/online/private/room/${room.code}`)
    } catch (error) {
      setCreateFailed(error instanceof PrivateRoomApiError && error.status === 401 ? 'unauthorized' : 'generic')
      setBusy(null)
    }
  }

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (code.length !== CODE_LENGTH && code.length !== LEGACY_CODE_LENGTH) {
      setJoinError('invalid')
      return
    }
    setJoinError(null)
    setBusy('joining')
    try {
      const room = await joinRoom(code)
      navigate(`/${lang}/online/private/room/${room.code}`)
    } catch (error) {
      setJoinError(
        error instanceof PrivateRoomApiError && error.status === 404
          ? 'notFound'
          : error instanceof PrivateRoomApiError && error.status === 401
            ? 'unauthorized'
            : 'generic',
      )
      setBusy(null)
    }
  }

  const activeIndex = Math.min(code.length, CODE_LENGTH - 1)

  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="private-room">
          <header className="private-room__header">
            <h1 className="private-room__title">{t('privateRoom.title')}</h1>
            <p className="private-room__subtitle">{t('privateRoom.subtitle')}</p>
          </header>

          <div className="private-room__grid">
            <section className="private-room__card" aria-labelledby="pr-create-title">
              <div className="private-room__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                     stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h2 id="pr-create-title" className="private-room__card-title">
                {t('privateRoom.createTitle')}
              </h2>
              <p className="private-room__card-text">{t('privateRoom.createText')}</p>

              <button
                type="button"
                className="landing-btn landing-btn--primary private-room__btn"
                onClick={onCreateRoom}
                disabled={busy !== null}
              >
                {busy === 'creating' ? t('privateRoom.creating') : t('privateRoom.create')}
              </button>

              {createFailed && (
                <p className="private-room__error" role="alert">
                  {t(`privateRoom.${createFailed}`)}
                </p>
              )}
              {createFailed === 'unauthorized' && (
                <LocalizedLink to="/online">{t('privateRoom.goOnline')}</LocalizedLink>
              )}
            </section>

            <div className="private-room__divider" aria-hidden="true">
              <span>{t('privateRoom.or')}</span>
            </div>

            <form
              className="private-room__card"
              onSubmit={onJoin}
              noValidate
              aria-labelledby="pr-join-title"
            >
              <div className="private-room__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                     stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                     strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
              </div>
              <h2 id="pr-join-title" className="private-room__card-title">
                {t('privateRoom.joinTitle')}
              </h2>

              <label className="private-room__field" htmlFor="pr-code">
                <span className="private-room__label">{t('privateRoom.codeLabel')}</span>

                <span className="private-room__code">
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <span
                      key={i}
                      className={
                        'private-room__digit' +
                        (focused && i === activeIndex ? ' is-active' : '') +
                        (code[i] ? ' is-filled' : '') +
                        (joinError ? ' is-invalid' : '')
                      }
                      aria-hidden="true"
                    >
                      {code[i] ?? ''}
                    </span>
                  ))}

                  <input
                    id="pr-code"
                    className="private-room__input"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}|\d{6}"
                    maxLength={CODE_LENGTH}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                      if (joinError) setJoinError(null)
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    aria-describedby="pr-hint"
                    aria-invalid={joinError !== null}
                  />
                </span>
              </label>

              <p id="pr-hint" className="private-room__hint">
                {t('privateRoom.hint')}
              </p>

              {joinError && (
                <p className="private-room__error" role="alert">
                  {t(`privateRoom.${joinError}`)}
                </p>
              )}
              {joinError === 'unauthorized' && (
                <LocalizedLink to="/online">{t('privateRoom.goOnline')}</LocalizedLink>
              )}

              <button
                type="submit"
                className="landing-btn private-room__btn"
                disabled={
                  (code.length !== CODE_LENGTH && code.length !== LEGACY_CODE_LENGTH) ||
                  busy !== null
                }
              >
                {busy === 'joining' ? t('privateRoom.joining') : t('privateRoom.join')}
              </button>
            </form>
          </div>
        </div>
      </main>

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
  //#endregion
}
//#endregion