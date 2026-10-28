import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import './NavBar.css' // NEU: CSS importiert
import sunUrl from '../assets/sun.svg'
import moonUrl from '../assets/moon.svg'
import speaker from '../assets/speaker-2-svgrepo-com.svg'
import speakerCrossed from '../assets/speaker-cross-svgrepo-com.svg'
import music from '../assets/music-note-svgrepo-com.svg'
import musicCrossed from '../assets/music-note-slash-svgrepo-com.svg'
import { useTheme } from '../hooks/useTheme'
import { useAudioSettings, setSoundVolume, setMusicVolume } from '../utils/audioSettings'

export default function NavBar() {
  const { theme, toggleTheme } = useTheme()

  const [isOpen, setIsOpen] = useState(false)

  const { sound: soundVolume, music: musicVolume } = useAudioSettings()

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isMuted = soundVolume === 0 && musicVolume === 0

  return (
    <nav className="landing-nav">
      <Link to="/" className="landing-logo">misere4x4</Link>
      
      <div className="nav-actions">
        
        {/* Sound Dropdown mit Slidern */}
        <div className="sound-menu-container" ref={menuRef}>
          <button 
            className="sound-toggle" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Audioeinstellungen"
            aria-expanded={isOpen}
          >
            <img src={isMuted ? speakerCrossed : speaker} alt="" width={20} height={20} />
          </button>

          {isOpen && (
            <div className="sound-dropdown">
              
              {/* Soundeffekte Regler */}
              <div className="sound-control">
                <img 
                  src={soundVolume === 0 ? speakerCrossed : speaker} 
                  alt="Soundeffekte" 
                  width={20} 
                  height={20} 
                />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={soundVolume} 
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  aria-label="Lautstärke für Soundeffekte"
                />
              </div>

              {/* Musik Regler */}
              <div className="sound-control">
                <img 
                  src={musicVolume === 0 ? musicCrossed : music} 
                  alt="Musik" 
                  width={20} 
                  height={20} 
                />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={musicVolume} 
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  aria-label="Lautstärke für Musik"
                />
              </div>

            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Darkmode umschalten">
          <img src={theme === 'dark' ? sunUrl : moonUrl} alt="" width={20} height={20} />
        </button>
      </div>
    </nav>
  )
}