"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/lib/auth-actions";

type View = "login" | "forgot" | "forgot-sent";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [view, setView] = useState<View>("login");

  // ── Login state ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Forgot state ──────────────────────────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") return null;

  const isLoginValid = email.trim().length > 0 && password.trim().length > 0;
  const isForgotValid = forgotEmail.trim().length > 3 && forgotEmail.includes("@");

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setLoginError("Email ou mot de passe incorrect.");
      setLoginLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const result = await requestPasswordReset(forgotEmail.trim());
    setForgotLoading(false);
    if (!result.success && result.error) {
      setForgotError(result.error);
      return;
    }
    setView("forgot-sent");
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-10px_rgba(107,26,42,0.1)]">
        <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-16 mx-auto mb-8" />

        {/* ── Vue login ── */}
        {view === "login" && (
          <>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1 text-center">
              Connectez-vous !{" "}
            </h1>
            {/* <p className="text-sm text-[#666666] text-center mb-8">Bienvenu Boss 💻</p> */}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 rounded-xl text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 cursor-pointer"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setForgotEmail(email);
                    setForgotError(null);
                  }}
                  className="text-xs text-[#6B1A2A] hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {loginError && (
                <p className="px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⛔ {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading || !isLoginValid}
                style={{ backgroundColor: "#6B1A2A" }}
                className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <span
                      style={{
                        width: "15px",
                        height: "15px",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.35)",
                        borderTopColor: "#fff",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    <span>Connexion...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  "Se connecter →"
                )}
              </button>
            </form>
          </>
        )}

        {/* ── Vue mot de passe oublié ── */}
        {view === "forgot" && (
          <>
            <button
              type="button"
              onClick={() => setView("login")}
              className="flex items-center gap-1 text-xs text-[#999] hover:text-[#6B1A2A] mb-6 cursor-pointer transition-colors"
            >
              ← Retour
            </button>

            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-[#666666] mb-8">
              Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de
              passe.
            </p>

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 rounded-xl text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20"
                />
              </div>

              {forgotError && (
                <p className="px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⛔ {forgotError}
                </p>
              )}

              <button
                type="submit"
                disabled={forgotLoading || !isForgotValid}
                style={{ backgroundColor: "#6B1A2A" }}
                className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <span
                      style={{
                        width: "15px",
                        height: "15px",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.35)",
                        borderTopColor: "#fff",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    <span>Envoi...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  "Envoyer le lien →"
                )}
              </button>
            </form>
          </>
        )}

        {/* ── Vue confirmation envoi ── */}
        {view === "forgot-sent" && (
          <div className="text-center">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📬</div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Email envoyé !</h1>
            <p className="text-sm text-[#666666] mb-2">
              Un lien de réinitialisation a été envoyé à <strong>{forgotEmail}</strong>.
            </p>
            <p className="text-xs text-[#999] mb-8">
              Le lien expire dans 60 minutes. Vérifiez vos spams si besoin.
            </p>
            <button
              type="button"
              onClick={() => setView("login")}
              style={{ backgroundColor: "#6B1A2A" }}
              className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90"
            >
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
