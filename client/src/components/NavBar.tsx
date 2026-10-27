import { Link } from 'react-router'
import sunUrl from '../assets/sun.svg'
import moonUrl from '../assets/moon.svg'
import { useTheme } from '../hooks/useTheme'

export default function NavBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="landing-nav">
      <Link to="/" className="landing-logo">misere4x4</Link>
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Darkmode umschalten">
        <img src={theme === 'dark' ? sunUrl : moonUrl} alt="" width={20} height={20} />
      </button>
    </nav>
  )
}