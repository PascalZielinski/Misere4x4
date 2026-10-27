import { Link } from "react-router";
import './404.css'

export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>Diese Seite gibt es nicht.</p>
      <Link to="/">Zurück zur Startseite</Link>
    </div>
  );
}