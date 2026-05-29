import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function PasswordRecoveryWidget({ session }) {
  const [mode, setMode] = useState("closed");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isPasswordRecovery = mode === "update-password";

  useEffect(() => {
    function openPasswordRecovery() {
      setMode("request-email");
    }

    window.addEventListener("open-password-recovery", openPasswordRecovery);

    return () => {
      window.removeEventListener("open-password-recovery", openPasswordRecovery);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const currentUrl = window.location.href;
    const isRecoveryUrl =
      currentUrl.includes("type=recovery") ||
      window.location.pathname.includes("reset-password");

    if (isRecoveryUrl) {
      setMode("update-password");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function sendRecoveryEmail(event) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    if (!email.trim()) {
      setMessage("Informe seu e-mail.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao enviar recuperação: ${error.message}`);
      return;
    }

    setMessage("Enviamos um link de recuperação para seu e-mail.");
  }

  async function updatePassword(event) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    if (password.length < 6) {
      setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao alterar senha: ${error.message}`);
      return;
    }

    setMessage("Senha alterada com sucesso. Você já pode entrar novamente.");

    window.setTimeout(() => {
      window.history.replaceState({}, "", window.location.origin);
      window.location.reload();
    }, 1800);
  }

  function closeModal() {
    setMode("closed");
    setMessage("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <>
      {mode !== "closed" && (
        <div className="password-recovery-backdrop">
          <section className="password-recovery-card">
            <button
              type="button"
              className="password-recovery-close"
              onClick={closeModal}
              aria-label="Fechar"
            >
              ×
            </button>

            {isPasswordRecovery ? (
              <form onSubmit={updatePassword}>
                <p className="eyebrow">Recuperação de acesso</p>
                <h2>Definir nova senha</h2>
                <p>
                  Digite sua nova senha para recuperar o acesso ao LN Digital.
                </p>

                <label>
                  Nova senha
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                  />
                </label>

                <label>
                  Confirmar nova senha
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </label>

                {message && <p className="password-recovery-message">{message}</p>}

                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar nova senha"}
                </button>
              </form>
            ) : (
              <form onSubmit={sendRecoveryEmail}>
                <p className="eyebrow">Recuperação de acesso</p>
                <h2>Esqueci minha senha</h2>
                <p>
                  Informe o e-mail da sua conta. Enviaremos um link para você
                  criar uma nova senha.
                </p>

                <label>
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                  />
                </label>

                {message && <p className="password-recovery-message">{message}</p>}

                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
