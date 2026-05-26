import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import PasswordRecoveryWidget from "./PasswordRecoveryWidget";
import { useLanguage } from "../../i18n/LanguageContext";

export default function AuthPage({ onDemoEnter }) {
  const { t } = useLanguage();
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
        <p className="eyebrow">{t("auth.eyebrow")}</p>
        <h1>{t("auth.title")}</h1>
        <p>
{t("auth.subtitle")}
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Cadastro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label>
              {t("auth.playerName")}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ex: Guilherme"
              />
            </label>
          )}

          <label>
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              required
            />
          </label>

          <label>
            {t("auth.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              required
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? t("auth.loading") : mode === "login" ? t("auth.enter") : t("auth.createAccount")}
          </button>

            {mode === "login" && (
              <button
                type="button"
                className="login-forgot-password-button"
                onClick={() =>
                  window.dispatchEvent(new Event("open-password-recovery"))
                }
              >
                {t("auth.forgotPassword")}
              </button>
            )}
        </form>

        {message && <p className="auth-message">{message}</p>}

        {!isSupabaseConfigured && (
          <div className="auth-demo-box">
            <strong>{t("auth.demoTitle")}</strong>
            <p>
{t("auth.demoText")}
            </p>

            <button type="button" onClick={onDemoEnter}>
              {t("auth.enterDemo")}
            </button>
          </div>
        )}
      </section>
    </main>
    </>
  );
}
