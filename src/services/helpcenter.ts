import { ARTICLES } from "@/lib/articles";
import type { Article } from "@/lib/types";

const norm = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const words = (s: string): string[] =>
  norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

/** Busca por palavras-chave; título e tags pesam mais que o corpo. */
export function search(
  query: string,
  limit = 3,
): (Article & { score: number })[] {
  const q = words(query);
  if (!q.length) return [];
  return ARTICLES.map((a) => {
    const title = norm(a.title);
    const tags = norm(a.tags.join(" "));
    const body = norm(a.body);
    let score = 0;
    for (const w of q) {
      if (title.includes(w)) score += 3;
      if (tags.includes(w)) score += 2;
      if (body.includes(w)) score += 1;
    }
    return { ...a, score };
  })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
