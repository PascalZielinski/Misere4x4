import { Trans, useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import './licensespage.css'

export default function LicensesPage() {
  const { t } = useTranslation()

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="licenses-card">
          <h1>{t('licenses.title')}</h1>

          {/* --- MUSIK --- */}
          <section className="license-section">
            <h2>{t('licenses.music.title')}</h2>
            <p>
              <Trans i18nKey="licenses.music.intro" components={{ b: <strong /> }} />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.recording')}</strong> Gregor Quendel (
                <a href="https://www.gregorquendel.com" target="_blank" rel="noopener noreferrer">
                  www.gregorquendel.com
                </a>
                )
              </li>
              <li>
                <strong>{t('licenses.labels.arrangement')}</strong> hmscomp
              </li>
              <li>
                <strong>{t('licenses.labels.source')}</strong> {t('licenses.music.providedBy')}{' '}
                <a href="https://www.classicals.de" target="_blank" rel="noopener noreferrer">
                  classicals.de
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.license')}</strong> {t('licenses.music.license')}
              </li>
            </ul>
          </section>

          {/* --- SOUNDEFFEKTE --- */}
          <section className="license-section">
            <h2>{t('licenses.sound.title')}</h2>
            <p>
              <Trans i18nKey="licenses.sound.intro" components={{ b: <strong /> }} />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.source')}</strong>{' '}
                <a
                  href="https://kenney.nl/assets/interface-sounds"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  kenney.nl/assets/interface-sounds
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.license')}</strong> {t('licenses.sound.license')}
              </li>
              <li>{t('licenses.sound.note')}</li>
            </ul>
          </section>

          {/* --- PIXABAY SOUNDEFFEKT --- */}
          <section className="license-section">
            <h2>{t('licenses.pixabaySound.title')}</h2>
            <p>
              <Trans
                i18nKey="licenses.pixabaySound.intro"
                components={{
                  author: (
                    <a
                      href="https://pixabay.com/de/users/samuelfjohanns-1207793/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=108930"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  pixabay: (
                    <a
                      href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=108930"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.source')}</strong>{' '}
                <a
                  href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=108930"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pixabay.com
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.license')}</strong>{' '}
                {t('licenses.pixabaySound.license')}
              </li>
            </ul>
          </section>

          {/* --- FREESOUND_COMMUNITY SOUNDEFFEKT --- */}
          <section className="license-section">
            <h2>{t('licenses.freesoundSound.title')}</h2>
            <p>
              <Trans
                i18nKey="licenses.freesoundSound.intro"
                components={{
                  author: (
                    <a
                      href="https://pixabay.com/users/freesound_community-46691455/"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  pixabay: (
                    <a
                      href="https://pixabay.com/sound-effects/"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.creator')}</strong>{' '}
                <a
                  href="https://pixabay.com/users/freesound_community-46691455/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  freesound_community
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.source')}</strong>{' '}
                <a
                  href="https://pixabay.com/sound-effects/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pixabay.com
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.license')}</strong>{' '}
                {t('licenses.freesoundSound.license')}
              </li>
              <li>{t('licenses.freesoundSound.thanks')}</li>
              <li>
                <Trans
                  i18nKey="licenses.freesoundSound.licenseNote"
                  components={{
                    license: (
                      <a
                        href="https://pixabay.com/service/license-summary/"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                />
              </li>
            </ul>
          </section>

          {/* --- ICONS & SVGs --- */}
          <section className="license-section">
            <h2>{t('licenses.icons.title')}</h2>
            <p>
              <Trans i18nKey="licenses.icons.intro" components={{ b: <strong /> }} />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.source')}</strong>{' '}
                <a href="https://www.svgrepo.com/" target="_blank" rel="noopener noreferrer">
                  www.svgrepo.com
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.license')}</strong> {t('licenses.icons.license')}
              </li>
            </ul>
          </section>

          {/* --- INSPIRATION: NEAL.FUN --- */}
          <section className="license-section">
            <h2>{t('licenses.inspiration.title')}</h2>
            <p>
              <Trans
                i18nKey="licenses.inspiration.intro"
                components={{ author: <strong /> }}
              />
            </p>
            <ul>
              <li>
                <strong>{t('licenses.labels.creator')}</strong>{' '}
                <a
                  href="https://neal.fun/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Neal Agarwal (neal.fun)
                </a>
              </li>
              <li>
                <strong>{t('licenses.labels.inspiration')}</strong>{' '}
                {t('licenses.inspiration.note')}
              </li>
              <li>
                <strong>{t('licenses.labels.credit')}</strong>{' '}
                <Trans
                  i18nKey="licenses.inspiration.credit"
                  components={{
                    neal: (
                      <a
                        href="https://neal.fun/"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                />
              </li>
            </ul>
          </section>

          {/* --- AUFGABENSTELLUNG --- */}
          <section className="license-section">
            <h2>{t('licenses.task.title')}</h2>
            <p>
              <Trans
                i18nKey="licenses.task.text"
                components={{
                  adesso: (
                    <a
                      href="https://www.adesso.de/de/"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            </p>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <LocalizedLink to="/" className="footer-link">
          {t('licenses.backHome')}
        </LocalizedLink>
      </footer>
    </div>
  )
}