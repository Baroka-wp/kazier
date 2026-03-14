import { NextResponse } from "next/server";

// ── Traduction MyMemory (gratuit, sans clé, EN → FR) ─────────────────────────

async function translate(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) return data.responseData.translatedText;
    return text; // fallback : texte original
  } catch {
    return text;
  }
}

// ── Route principale ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Récupère 50 citations depuis ZenQuotes
    const res = await fetch("https://zenquotes.io/api/quotes", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("ZenQuotes indisponible");

    const data = await res.json();

    // 2. Prend 10 citations aléatoires
    const selected = data
      .sort(() => Math.random() - 0.5)
      .slice(0, 1);

    // 3. Traduit toutes les citations en parallèle
    const translated = await Promise.all(
      selected.map(async (item: { q: string; a: string }) => ({
        quote: await translate(item.q),
        author: item.a,
      }))
    );

    return NextResponse.json(translated);

  } catch (err) {
    console.error("[citation]", err);
    return NextResponse.json([
      { quote: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
      { quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
      { quote: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
      { quote: "Celui qui déplace une montagne commence par déplacer de petites pierres.", author: "Confucius" },
      { quote: "La créativité, c'est l'intelligence qui s'amuse.", author: "Albert Einstein" },
    ]);
  }
}