/**
 * TeamPulseReportRetriever — Lexical RAG Retriever for Team Pulse Report Corpus
 * 
 * Fetches public/data/team-pulse-rag.json and performs accent-insensitive,
 * weighted lexical ranking to retrieve the most relevant chunks for user queries.
 */

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'et', 'ou',
  'en', 'a', 'au', 'aux', 'pour', 'dans', 'sur', 'par', 'avec', 'sans',
  'ce', 'cette', 'ces', 'est', 'sont', 'que', 'qui', 'quoi', 'comment',
  'pourquoi', 'quand', 'ou', 'ne', 'pas', 'plus', 'nous', 'vous', 'il',
  'elle', 'ils', 'elles', 'on', 'je', 'tu', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes'
]);

export function normalizeFrenchText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

export function extractTokens(query = '') {
  const normalized = normalizeFrenchText(query);
  return normalized
    .split(/\s+/)
    .filter(word => word.length >= 2 && !STOP_WORDS.has(word));
}

export class TeamPulseReportRetriever {
  constructor(dataPath = 'public/data/team-pulse-rag.json') {
    this.dataPath = dataPath;
    this.chunks = null;
    this.loadPromise = null;
  }

  async load() {
    if (this.chunks) return this.chunks;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        let data;
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
          const fs = await import('node:fs');
          const path = await import('node:path');
          const fullPath = path.resolve(process.cwd(), this.dataPath);
          const raw = fs.readFileSync(fullPath, 'utf8');
          data = JSON.parse(raw);
        } else {
          const res = await fetch(this.dataPath, { cache: 'no-store' });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} fetching ${this.dataPath}`);
          }
          data = await res.json();
        }

        if (!Array.isArray(data)) {
          throw new Error('RAG data is not a JSON array');
        }
        this.chunks = data.map(chunk => ({
          ...chunk,
          normalizedTitle: normalizeFrenchText(chunk.title || ''),
          normalizedText: normalizeFrenchText(chunk.text || ''),
          normalizedTags: Array.isArray(chunk.tags) 
            ? chunk.tags.map(t => normalizeFrenchText(t)).join(' ') 
            : normalizeFrenchText(chunk.tags || '')
        }));
        return this.chunks;
      } catch (err) {
        console.error('[TeamPulseReportRetriever] Error loading RAG data:', err);
        this.chunks = [];
        return [];
      }
    })();

    return this.loadPromise;
  }

  async retrieve(query = '', maxChunks = 5) {
    const chunks = await this.load();
    if (!chunks || chunks.length === 0) {
      return {
        found: false,
        contextText: "Information indisponible (corpus de rapport non chargé).",
        chunks: []
      };
    }

    const tokens = extractTokens(query);
    if (tokens.length === 0) {
      const summaryChunks = chunks.slice(0, Math.min(maxChunks, 4));
      return {
        found: true,
        contextText: this.formatContext(summaryChunks),
        chunks: summaryChunks
      };
    }

    const scored = chunks.map(chunk => {
      let score = 0;
      tokens.forEach(token => {
        if (chunk.normalizedTitle.includes(token)) score += 4.0;
        if (chunk.normalizedTags.includes(token)) score += 3.0;
        if (chunk.normalizedText.includes(token)) score += 1.0;
      });
      return { chunk, score };
    });

    const matches = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.chunk);

    if (matches.length === 0) {
      const fallbackChunks = chunks.slice(0, 3);
      return {
        found: false,
        contextText: `[Aucun extrait direct ne correspond exactement aux termes "${query}". Voici les sections principales du rapport :]` + '\n\n' + this.formatContext(fallbackChunks),
        chunks: fallbackChunks
      };
    }

    const selected = matches.slice(0, maxChunks);
    return {
      found: true,
      contextText: this.formatContext(selected),
      chunks: selected
    };
  }

  formatContext(chunks) {
    let contextStr = `=== CONTEXTE DE VÉRIFICATION DE RAPPORT (SOURCE UNTRUSTED DATA) ===\n`;
    let totalLen = 0;
    const MAX_CHAR_LENGTH = 2800;

    for (const chunk of chunks) {
      const header = `\n[EXTRAIT: ${chunk.id} | Titre: ${chunk.title}]\n`;
      const body = `${chunk.text}\n`;
      if (totalLen + header.length + body.length > MAX_CHAR_LENGTH && totalLen > 500) {
        break;
      }
      contextStr += header + body;
      totalLen += header.length + body.length;
    }

    contextStr += `\n=== FIN DU CONTEXTE DE VÉRIFICATION ===`;
    return contextStr;
  }
}
