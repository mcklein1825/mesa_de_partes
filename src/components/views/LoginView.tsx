import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  Building2,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck
} from 'lucide-react'
import type { Role, User } from '../../types'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../common/Logo'

interface LoginViewProps {
  onSelectUser: (user: User | null) => void
}

const isRole = (value: string): value is Role =>
  ['MesaPartes', 'AreaOperativa', 'Administrador', 'Auditor'].includes(value)

export default function LoginView({ onSelectUser }: LoginViewProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let mounted = true
    let receivedAuthEvent = false

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true
      setSession(nextSession)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || receivedAuthEvent) return

      if (error) {
        setErrorMessage(`No se pudo recuperar la sesión: ${error.message}`)
        setLoading(false)
        return
      }

      setSession(data.session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!session) {
      onSelectUser(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    void (async () => {
      const { data: profile, error } = await supabase
        .from('perfiles')
        .select('nombre, rol, area, activo')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setErrorMessage(`No se pudo validar el perfil: ${error.message}`)
        setLoading(false)
        return
      }

      if (!profile || !profile.activo || !isRole(profile.rol)) {
        const { error: signOutError } = await supabase.auth.signOut()

        if (active) {
          setErrorMessage(
            signOutError
              ? `El perfil no está habilitado y no se pudo cerrar la sesión: ${signOutError.message}`
              : 'El perfil no está habilitado para acceder al sistema.'
          )
          setLoading(false)
        }
        return
      }

      onSelectUser({
        id: session.user.id,
        nombre: profile.nombre,
        email: session.user.email ?? '',
        rol: profile.rol,
        area: profile.area,
        activo: profile.activo
      })

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [session, onSelectUser])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (error) {
      setErrorMessage(`No se pudo iniciar sesión: ${error.message}`)
    }

    setSubmitting(false)
  }

  return (
    <main className="login-screen">
      <div className="login-frame">
        <section className="login-brand-panel" aria-label="Instituto Gilda Ballivián">
          <div className="login-brand-top">
            <Logo compact />
            <div>
              <span>INSTITUTO DE EDUCACIÓN SUPERIOR</span>
              <strong>GILDA BALLIVIÁN</strong>
            </div>
          </div>

          <div className="login-brand-copy">
            <span className="login-kicker"><Building2 size={15} /> PLATAFORMA INSTITUCIONAL</span>
            <h1 id="login-title">Tu trabajo,<br />en buenas manos.</h1>
            <p>Un espacio seguro para organizar, derivar y dar seguimiento a la documentación institucional.</p>
            <div className="login-brand-rule" />
            <div className="login-brand-caption">
              <ShieldCheck size={18} />
              <span>Gestión clara. Información siempre disponible.</span>
            </div>
          </div>

          <div className="login-brand-footer">
            <span>SISTEMA DE GESTIÓN DOCUMENTAL · DIRECCIÓN GENERAL</span>
            <span>© {new Date().getFullYear()} IESTP Gilda Ballivián</span>
          </div>
          <div className="login-decoration login-decoration-one" />
          <div className="login-decoration login-decoration-two" />
        </section>

        <section className="login-content" aria-labelledby="login-form-title">
          <div className="login-content-top">
            <span className="login-mobile-brand"><Logo compact /> IESTP Gilda Ballivián</span>
            <span className="login-secure-label"><ShieldCheck size={15} /> Acceso institucional</span>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <span className="login-heading-icon"><LockKeyhole size={19} /></span>
              <span className="login-eyebrow">BIENVENIDO/A</span>
              <h2 id="login-form-title">Ingresa a tu espacio</h2>
              <p>Inicia sesión con tu cuenta institucional para continuar.</p>
            </div>

            {loading ? (
              <div className="login-loading" role="status">
                <span className="login-spinner" />
                Validando sesión y perfil...
              </div>
            ) : (
              <form className="login-auth-form" onSubmit={handleSubmit}>
                <label className="login-field">
                  <span>Correo institucional</span>
                  <span className="login-input-wrap">
                    <Mail size={17} aria-hidden="true" />
                    <input
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="nombre@instituto.edu.pe"
                      required
                    />
                  </span>
                </label>

                <label className="login-field">
                  <span>Contraseña</span>
                  <span className="login-input-wrap">
                    <LockKeyhole size={17} aria-hidden="true" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>

                {errorMessage && (
                  <div className="login-error" role="alert">
                    <CircleAlert size={18} />
                    <p>{errorMessage}</p>
                  </div>
                )}

                <button className="login-submit-button" type="submit" disabled={submitting}>
                  {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  {!submitting && <ArrowRight size={17} />}
                </button>
              </form>
            )}
          </div>

          <div className="login-content-footer">
            <ShieldCheck size={15} />
            <span>Entorno de uso exclusivo para personal autorizado</span>
          </div>
        </section>
      </div>
    </main>
  )
}