import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function AuthPage({ onDemoEnter }) {
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
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">LN Digital</p>
        <h1>Legendary Ninja Digital</h1>
        <p>
          Entre ou crie sua conta para acessar seu ninja, acompanhar localização,
          viagens e evolução.
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
              Nome de jogador
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ex: Guilherme"
              />
            </label>
          )}

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              required
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        {!isSupabaseConfigured && (
          <div className="auth-demo-box">
            <strong>Modo demonstração</strong>
            <p>
              O Supabase ainda não foi conectado. Você pode continuar testando
              localmente enquanto configuramos o banco online.
            </p>

            <button type="button" onClick={onDemoEnter}>
              Entrar em modo demonstração
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
