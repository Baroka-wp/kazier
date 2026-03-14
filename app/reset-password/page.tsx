"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateResetToken, resetPassword } from "@/lib/auth-actions";

type View = "loading" | "invalid" | "form" | "success";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [view, setView] = useState<View>("loading");
  const [tokenError, setTokenError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      Promise.resolve().then(() => {
        setView("invalid");
        setTokenError("Lien invalide.");
      });
      return;
    }
    validateResetToken(token).then(res => {
      if (!res.valid) {
        setView("invalid");
        setTokenError(res.error || "Lien invalide.");
      } else {
        setView("form");
      }
    });
  }, [token]);

  const passwordMatch = password === confirm;
  const isValid = password.length >= 6 && passwordMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setSubmitError("");
    const result = await resetPassword(token, password);
    setLoading(false);
    if (!result.success) { setSubmitError(result.error || "Une erreur est survenue."); return; }
    setView("success");
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-10px_rgba(107,26,42,0.1)]">

        <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-16 mx-auto mb-8" />

        {/* Loading */}
        {view === "loading" && (
          <div className="text-center py-8">
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid rgba(107,26,42,0.15)", borderTopColor: "#6B1A2A", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
            <p className="text-sm text-[#666]">Vérification du lien...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Token invalide / expiré */}
        {view === "invalid" && (
          <div className="text-center">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⛔</div>
            <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Lien invalide</h1>
            <p className="text-sm text-[#666666] mb-8">{tokenError}</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{ backgroundColor: "#6B1A2A" }}
              className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer hover:opacity-90 transition-all"
            >
              Retour à la connexion
            </button>
          </div>
        )}

        {/* Formulaire */}
        {view === "form" && (
          <>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Nouveau mot de passe</h1>
            <p className="text-sm text-[#666666] mb-8">Choisissez un mot de passe d&apos;au moins 6 caractères.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 cursor-pointer">
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {/* Barre de force */}
                {password.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: password.length >= i * 4
                          ? i === 1 ? "#EF4444" : i === 2 ? "#F59E0B" : "#22C55E"
                          : "rgba(0,0,0,0.08)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required placeholder="••••••••"
                  style={{ borderColor: confirm.length > 0 && !passwordMatch ? "#EF4444" : "" }}
                  className="w-full px-4 py-3 rounded-xl text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20"
                />
                {confirm.length > 0 && !passwordMatch && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              {submitError && (
                <p className="px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⛔ {submitError}
                </p>
              )}

              <button
                type="submit" disabled={loading || !isValid}
                style={{ backgroundColor: "#6B1A2A" }}
                className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    <span>Enregistrement...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : "Enregistrer le mot de passe →"}
              </button>
            </form>
          </>
        )}

        {/* Succès */}
        {view === "success" && (
          <div className="text-center">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Mot de passe mis à jour !</h1>
            <p className="text-sm text-[#666666] mb-8">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{ backgroundColor: "#6B1A2A" }}
              className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer hover:opacity-90 transition-all"
            >
              Se connecter →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center">
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid rgba(107,26,42,0.15)", borderTopColor: "#6B1A2A", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}