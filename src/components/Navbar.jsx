import { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import {
  SABERES_LOGO,
  getAssetUrl,
  getEditProfileUrl,
  getHomeUrl,
  getLoginUrl,
  getLogoutUrl,
  getProfileUrl
} from '../config/api';
import { ChevronIcon, HomeIcon } from './Icons';
import './Navbar.css';

/** Iniciales para el avatar cuando la sesión no trae foto. */
function initialsOf(user) {
  const letters = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part.trim()[0])
    .join('');
  return (letters || user?.name?.trim()[0] || '?').toUpperCase();
}

/**
 * Barra superior de SaberesMX: logo, inicio y menú de usuario.
 * Réplica de content_viewer/partials/navigationBar.php.
 */
export default function Navbar() {
  const { user, isAuthenticated, userName } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Cerrar el menú al hacer clic fuera o con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="cv-navbar">
      <a className="cv-navbar__brand" href={getHomeUrl()}>
        <img src={getAssetUrl(SABERES_LOGO)} alt="SaberesMX" />
      </a>

      <nav className="cv-navbar__actions" aria-label="Acciones de la cuenta">
        <a className="cv-navbar__icon" href={getHomeUrl()} title="Inicio" aria-label="Inicio">
          <HomeIcon />
        </a>

        {isAuthenticated ? (
          <div className="cv-navbar__user" ref={menuRef}>
            <button
              type="button"
              className="cv-navbar__userBtn"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {user.photo ? (
                <img className="cv-avatar cv-avatar--photo" src={user.photo} alt="" />
              ) : (
                <span className="cv-avatar" aria-hidden="true">{initialsOf(user)}</span>
              )}
              <span className="cv-navbar__userName">{userName}</span>
              <ChevronIcon expanded={menuOpen} />
            </button>

            {menuOpen && (
              <ul className="cv-navbar__menu" role="menu">
                <li role="none">
                  <a role="menuitem" href={getProfileUrl(user.id)}>Mi perfil</a>
                </li>
                <li role="none">
                  <a role="menuitem" href={getEditProfileUrl()}>Editar perfil</a>
                </li>
                <li className="cv-navbar__menuSep" role="separator" />
                <li role="none">
                  <a role="menuitem" href={getLogoutUrl()}>Salir</a>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <a className="cv-navbar__login" href={getLoginUrl('courseViewer')}>
            Iniciar sesión
          </a>
        )}
      </nav>
    </header>
  );
}
