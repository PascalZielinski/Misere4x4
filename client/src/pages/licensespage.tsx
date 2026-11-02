//#region Imports
// MARK: - Imports
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import './licensespage.css'
//#endregion

//#region License components
// MARK: - License components
function ExtLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

//#region License category card
// MARK: License category card
function CategoryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="license-category">
      <header className="license-category__header">
        <h2>{title}</h2>
      </header>
      <div className="license-category__body">{children}</div>
    </section>
  )
}
//#endregion

//#region License entry
// MARK: License entry
function Entry({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <article className="license-entry">
      {title && <h3>{title}</h3>}
      {children}
    </article>
  )
}
//#endregion
//#endregion

//#region License page data
// MARK: - License page data
const PIXABAY_SFX =
  'https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=108930'
const PIXABAY_AUTHOR =
  'https://pixabay.com/de/users/samuelfjohanns-1207793/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=108930'
const FREESOUND_AUTHOR = 'https://pixabay.com/users/freesound_community-46691455/'
//#endregion

//#region Licenses page
// MARK: - Licenses page
export default function LicensesPage() {
  //#region Translations
  // MARK: Translations
  const { t } = useTranslation()
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main licenses-main">
        <header className="licenses-header">
          <h1>{t('licenses.title')}</h1>
        </header>

        <div className="licenses-grid">
          <CategoryCard title={t('licenses.categories.music')}>
            <Entry title={t('licenses.music.title')}>
              <p>
                <Trans i18nKey="licenses.music.intro" components={{ b: <strong /> }} />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.recording')}</strong> Gregor Quendel (
                  <ExtLink href="https://www.gregorquendel.com">www.gregorquendel.com</ExtLink>)
                </li>
                <li>
                  <strong>{t('licenses.labels.arrangement')}</strong> hmscomp
                </li>
                <li>
                  <strong>{t('licenses.labels.source')}</strong> {t('licenses.music.providedBy')}{' '}
                  <ExtLink href="https://www.classicals.de">classicals.de</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.license')}</strong> {t('licenses.music.license')}
                </li>
              </ul>
            </Entry>
          </CategoryCard>

          <CategoryCard title={t('licenses.categories.graphics')}>
            <Entry title={t('licenses.icons.title')}>
              <p>
                <Trans i18nKey="licenses.icons.intro" components={{ b: <strong /> }} />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.source')}</strong>{' '}
                  <ExtLink href="https://www.svgrepo.com/">www.svgrepo.com</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.license')}</strong> {t('licenses.icons.license')}
                </li>
              </ul>
            </Entry>
          </CategoryCard>

          <CategoryCard title={t('licenses.categories.sound')}>
            <Entry title={t('licenses.sound.title')}>
              <p>
                <Trans i18nKey="licenses.sound.intro" components={{ b: <strong /> }} />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.source')}</strong>{' '}
                  <ExtLink href="https://kenney.nl/assets/interface-sounds">
                    kenney.nl/assets/interface-sounds
                  </ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.license')}</strong> {t('licenses.sound.license')}
                </li>
                <li>{t('licenses.sound.note')}</li>
              </ul>
            </Entry>

            <Entry title={t('licenses.pixabaySound.title')}>
              <p>
                <Trans
                  i18nKey="licenses.pixabaySound.intro"
                  components={{
                    author: <ExtLink href={PIXABAY_AUTHOR} />,
                    pixabay: <ExtLink href={PIXABAY_SFX} />,
                  }}
                />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.source')}</strong>{' '}
                  <ExtLink href={PIXABAY_SFX}>pixabay.com</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.license')}</strong>{' '}
                  {t('licenses.pixabaySound.license')}
                </li>
              </ul>
            </Entry>

            <Entry title={t('licenses.freesoundSound.title')}>
              <p>
                <Trans
                  i18nKey="licenses.freesoundSound.intro"
                  components={{
                    author: <ExtLink href={FREESOUND_AUTHOR} />,
                    pixabay: <ExtLink href="https://pixabay.com/sound-effects/" />,
                  }}
                />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.creator')}</strong>{' '}
                  <ExtLink href={FREESOUND_AUTHOR}>freesound_community</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.source')}</strong>{' '}
                  <ExtLink href="https://pixabay.com/sound-effects/">pixabay.com</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.license')}</strong>{' '}
                  {t('licenses.freesoundSound.license')}
                </li>
              </ul>
            </Entry>
          </CategoryCard>

          <CategoryCard title={t('licenses.categories.project')}>
            <Entry title={t('licenses.inspiration.title')}>
              <p>
                <Trans
                  i18nKey="licenses.inspiration.intro"
                  components={{ author: <strong /> }}
                />
              </p>
              <ul>
                <li>
                  <strong>{t('licenses.labels.creator')}</strong>{' '}
                  <ExtLink href="https://neal.fun/">Neal Agarwal (neal.fun)</ExtLink>
                </li>
                <li>
                  <strong>{t('licenses.labels.credit')}</strong>{' '}
                  <Trans
                    i18nKey="licenses.inspiration.credit"
                    components={{ neal: <ExtLink href="https://neal.fun/" /> }}
                  />
                </li>
              </ul>
            </Entry>

            <Entry title={t('licenses.task.title')}>
              <p>
                <Trans
                  i18nKey="licenses.task.text"
                  components={{ adesso: <ExtLink href="https://www.adesso.de/de/" /> }}
                />
              </p>
            </Entry>
          </CategoryCard>
        </div>
      </main>

      <footer className="site-footer">
        <LocalizedLink to="/" className="footer-link">
          {t('licenses.backHome')}
        </LocalizedLink>
      </footer>
    </div>
  )
  //#endregion
}
//#endregion