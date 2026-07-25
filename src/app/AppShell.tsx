import { Code2 } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="CloudPath, inicio">
          <img
            className="brand-mark"
            src="/brand/cloudpath-mark.svg"
            alt=""
            width={32}
            height={32}
          />
          <span>CloudPath</span>
        </Link>
        <nav aria-label="Navegación principal">
          <a
            className="icon-link"
            href="https://github.com/Yosoyepa/agentic-dev-hackathon-setup"
            aria-label="Código abierto de CloudPath"
            rel="noreferrer"
            target="_blank"
          >
            <Code2 size={18} strokeWidth={1.75} />
          </a>
          <Link className="button button-secondary" to="/interview">
            Construir mi ruta
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
