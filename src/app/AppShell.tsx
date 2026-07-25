import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { AmbientBackground } from "../components/AmbientBackground";

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isLanding = location.pathname === "/";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const hashTarget = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;
      if (hashTarget) {
        hashTarget.scrollIntoView({ block: "start" });
        return;
      }

      mainRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  return (
    <div className={`app-shell${isLanding ? " app-shell--landing" : ""}`}>
      <AmbientBackground />
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" to="/" aria-label="CloudPath, inicio">
            <img
              src="/brand/cloudpath-logo.svg"
              alt=""
              width={127}
              height={34}
            />
          </Link>
          <nav aria-label="Navegación principal">
            <Link to="/route">Mi ruta</Link>
            <Link to="/lesson/security-iam-fundamentals#sources">Fuentes</Link>
            <a
              href="https://github.com/Yosoyepa/cloudpath-front"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="page-footer">
        <div className="cp-container page-footer__inner">
          <span>© 2026 CloudPath</span>
          <span>AWS Certified Cloud Practitioner</span>
        </div>
      </footer>
    </div>
  );
}
