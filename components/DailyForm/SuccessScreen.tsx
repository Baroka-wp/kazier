"use client";

import { useState } from "react";
import Screen from "./Screen";
import Confetti from "./Confetti";

type Citation = { quote: string; author: string };

type Props = {
  answers: Record<string, string>;
  confetti: boolean;
  onReset: () => void;
  // Citations pré-chargées depuis ReviewScreen (peut être vide si encore en cours)
  preloadedCitations?: Citation[];
};

const FALLBACK_CITATIONS: Citation[] = [
  {
    quote: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.",
    author: "Winston Churchill",
  },
  {
    quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.",
    author: "Albert Einstein",
  },
  {
    quote: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.",
    author: "Steve Jobs",
  },
];

export default function SuccessScreen({ confetti, preloadedCitations }: Props) {
  // Si les citations sont déjà prêtes on les affiche directement, sinon fallback
  const citations =
    preloadedCitations && preloadedCitations.length > 0 ? preloadedCitations : FALLBACK_CITATIONS;

  const [index, setIndex] = useState(0);
  const [sliding, setSliding] = useState<"left" | "right" | null>(null);

  function navigate(dir: "prev" | "next") {
    if (sliding || citations.length === 0) return;
    const direction = dir === "next" ? "left" : "right";
    setSliding(direction);
    setTimeout(() => {
      setIndex((i) =>
        dir === "next" ? (i + 1) % citations.length : (i - 1 + citations.length) % citations.length
      );
      setSliding(null);
    }, 220);
  }

  const current = citations[index];

  return (
    <Screen>
      <Confetti active={confetti} />
      <div className="text-center max-w-md mx-auto">
        <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-16 mx-auto mb-6" />

        <h2 className="text-4xl font-bold text-[#1A1A1A] mb-2">Rapport envoyé !</h2>
        <p style={{ color: "#666" }} className="text-sm mb-8">
          Beau travail aujourd&apos;hui.
        </p>

        {/* Carousel citation — plus de loading, les citations sont déjà là */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{
            background: "rgba(107,26,42,0.04)",
            border: "1.5px solid rgba(107,26,42,0.1)",
            minHeight: "130px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {current && (
            <div
              style={{
                transition: "opacity 0.22s ease, transform 0.22s ease",
                opacity: sliding ? 0 : 1,
                transform:
                  sliding === "left"
                    ? "translateX(-18px)"
                    : sliding === "right"
                      ? "translateX(18px)"
                      : "translateX(0)",
              }}
            >
              <p
                style={{ color: "#1A1A1A", fontStyle: "italic", lineHeight: 1.65 }}
                className="text-base mb-3 text-left"
              >
                &quot;{current.quote}&quot;
              </p>
              <p
                style={{ color: "#6B1A2A" }}
                className="text-xs font-semibold uppercase tracking-widest text-left"
              >
                — {current.author}
              </p>
            </div>
          )}
        </div>

        {/* Navigation flèches + points */}
        {citations.length > 1 && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => navigate("prev")}
              className="nav-arrow cursor-pointer"
              aria-label="Citation précédente"
            >
              ←
            </button>

            <div className="flex gap-1.5">
              {citations.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i === index) return;
                    const dir = i > index ? "left" : "right";
                    setSliding(dir);
                    setTimeout(() => {
                      setIndex(i);
                      setSliding(null);
                    }, 220);
                  }}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    width: i === index ? "20px" : "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: i === index ? "#6B1A2A" : "rgba(107,26,42,0.2)",
                    border: "none",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => navigate("next")}
              className="nav-arrow cursor-pointer"
              aria-label="Citation suivante"
            >
              →
            </button>
          </div>
        )}
      </div>

      <style>{`
        .nav-arrow {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 1.5px solid rgba(107,26,42,0.2);
          background: transparent;
          color: #6B1A2A;
          font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .nav-arrow:hover {
          background: rgba(107,26,42,0.08);
          border-color: rgba(107,26,42,0.4);
        }
      `}</style>
    </Screen>
  );
}
