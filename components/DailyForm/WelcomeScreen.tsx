import { BRAND, QUESTIONS_GLOBAL, QUESTIONS_PROJECT } from "./questions";
import Screen from "./Screen";

type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  const totalQuestions = QUESTIONS_GLOBAL.length + QUESTIONS_PROJECT.length;

  return (
    <Screen>
      <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-16 mb-6" />
      <h1 className="text-4xl font-bold text-[#1A1A1A] leading-tight mb-4">
        Comment s&apos;est
        <br />
        passée votre journée ?
      </h1>
      <p className="text-[#666666] mb-8">{totalQuestions} questions · ~ 3 min</p>
      <button
        onClick={onStart}
        style={{ backgroundColor: BRAND }}
        className="w-full px-8 py-4 rounded-2xl font-semibold text-white text-lg cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5"
      >
        Commencer →
      </button>
    </Screen>
  );
}
