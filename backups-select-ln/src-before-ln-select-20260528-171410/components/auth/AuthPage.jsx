import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import PasswordRecoveryWidget from "./PasswordRecoveryWidget";
import { useLanguage } from "../../i18n/LanguageContext";

const AUTH_FALLBACK = {
  "auth.eyebrow": "Acesso Shinobi",
  "auth.title": "Entrar na Legendary",
  "auth.subtitle": "Acesse sua conta para continuar sua jornada no mundo ninja.",
  "auth.login": "Login",
  "auth.register": "Cadastro",
  "auth.playerName": "Nome do player",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.loading": "Carregando...",
  "auth.enter": "Entrar",
  "auth.createAccount": "Criar conta",
  "auth.forgotPassword": "Esqueci minha senha",
  "auth.demoTitle": "Modo demonstração",
  "auth.demoText": "O Supabase ainda não foi configurado. Você pode entrar em modo demonstração para visualizar o sistema.",
  "auth.enterDemo": "Entrar em modo demonstração"
};

export default function AuthPage({ onDemoEnter }) {
  const { t } = useLanguage();

  function tr(key) {
    const translated = t?.(key);

    if (!translated || translated === key) {
      return AUTH_FALLBACK[key] || key;
    }

    return translated;
  }

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase ainda não foi configurado. Use o modo demonstração por enquanto.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName
            }
          }
        });

        if (error) throw error;

        setMessage("Cadastro criado. Se o Supabase exigir confirmação, verifique seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || "Erro ao autenticar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PasswordRecoveryWidget session={null} />

      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">{tr("auth.eyebrow")}</p>
          <h1>{tr("auth.title")}</h1>
          <p>{tr("auth.subtitle")}</p>

          <div className="auth-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              {tr("auth.login")}
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              {tr("auth.register")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <label>
                {tr("auth.playerName")}
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ex: Guilherme"
                />
              </label>
            )}

            <label>
              {tr("auth.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
                required
              />
            </label>

            <label>
              {tr("auth.password")}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </label>

            <button type="submit" disabled={isLoading}>
              {isLoading
                ? tr("auth.loading")
                : mode === "login"
                  ? tr("auth.enter")
                  : tr("auth.createAccount")}
            </button>

            {mode === "login" && (
              <button
                type="button"
                className="login-forgot-password-button"
                onClick={() =>
                  window.dispatchEvent(new Event("open-password-recovery"))
                }
              >
                {tr("auth.forgotPassword")}
              </button>
            )}
          </form>

          {message && <p className="auth-message">{message}</p>}

          {!isSupabaseConfigured && (
            <div className="auth-demo-box">
              <strong>{tr("auth.demoTitle")}</strong>
              <p>{tr("auth.demoText")}</p>

              <button type="button" onClick={onDemoEnter}>
                {tr("auth.enterDemo")}
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
