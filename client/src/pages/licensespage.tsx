import { Link } from 'react-router'
import NavBar from '../components/NavBar'
import './licensespage.css'

export default function LicensesPage() {
  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="licenses-card">
          <h1>Lizenzen &amp; Credits</h1>

          {/* --- MUSIK --- */}
          <section className="license-section">
            <h2>Musik</h2>
            <p>
              <strong>„Rêverie, L. 68“</strong> von Claude Debussy.
            </p>
            <ul>
              <li>
                <strong>Aufnahme und Produktion:</strong> Gregor Quendel (
                <a href="https://www.gregorquendel.com" target="_blank" rel="noopener noreferrer">
                  www.gregorquendel.com
                </a>
                )
              </li>
              <li><strong>Arrangement:</strong> hmscomp</li>
              <li>
                <strong>Quelle:</strong> Zur Verfügung gestellt von{' '}
                <a href="https://www.classicals.de" target="_blank" rel="noopener noreferrer">
                  classicals.de
                </a>
              </li>
              <li><strong>Lizenz:</strong> Nicht-kommerzielle Nutzung (Creative Commons)</li>
            </ul>
          </section>

          {/* --- SOUNDEFFEKTE --- */}
          <section className="license-section">
            <h2>Soundeffekte</h2>
            <p>
              <strong>Interface Sounds</strong> von Kenney.
            </p>
            <ul>
              <li>
                <strong>Quelle:</strong>{' '}
                <a
                  href="https://kenney.nl/assets/interface-sounds"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  kenney.nl/assets/interface-sounds
                </a>
              </li>
              <li><strong>Lizenz:</strong> Creative Commons CC0 1.0 (Public Domain)</li>
              <li>
                Die Nutzung ist ohne Namensnennung gestattet. Wir nennen den Urheber
                dennoch freiwillig zur Anerkennung seiner Arbeit.
              </li>
            </ul>
          </section>

          {/* --- ICONS & SVGs --- */}
          <section className="license-section">
            <h2>Icons &amp; SVGs</h2>
            <p>
              Die auf dieser Seite verwendeten Icons (Sonne, Mond, Lautsprecher,
              Musiknoten, Retry) stammen von <strong>SVG Repo</strong>.
            </p>
            <ul>
              <li>
                <strong>Quelle:</strong>{' '}
                <a href="https://www.svgrepo.com/" target="_blank" rel="noopener noreferrer">
                  www.svgrepo.com
                </a>
              </li>
              <li>
                <strong>Lizenz:</strong> Die Icons sind unter verschiedenen
                Open-Source-Lizenzen (z. B. CC0, MIT) verfügbar und für die freie
                Nutzung in Projekten gedacht.
              </li>
            </ul>
          </section>

          {/* --- AUFGABENSTELLUNG --- */}
          <section className="license-section">
            <h2>Aufgabenstellung</h2>
            <p>
              Idee, Regeln sowie die Skizze stammen aus der Bewerbungsaufgabe - Drei in einer Reihe.pdf von{' '}
              <a href="https://www.adesso.de/de/" target="_blank" rel="noopener noreferrer">
                adesso SE
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <Link to="/" className="footer-link">
          Zur Startseite
        </Link>
      </footer>
    </div>
  )
}