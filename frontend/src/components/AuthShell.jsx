import { SECTIONS } from '../api/catalogs'

// Split screen shared by sign-in and password reset: brand panel on the left, the form on the right.
export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-brand-top">
          <img className="auth-logo" src="/logo.png" alt="Sand Valley" />
        </div>

        <div className="auth-brand-copy">
          <h2>The catalog farmers see, managed in one place.</h2>
          <p>Add products, update images and keep engineer contacts current. Save a change here and it shows up in the Sand Valley app.</p>
        </div>

        <ul className="auth-sections" aria-label="Sections you can manage">
          {SECTIONS.map((s) => (
            <li key={s.key} style={{ '--accent': s.accent }}>
              <s.icon />
              {s.label}
            </li>
          ))}
        </ul>
      </aside>

      <main className="auth-main">{children}</main>
    </div>
  )
}
