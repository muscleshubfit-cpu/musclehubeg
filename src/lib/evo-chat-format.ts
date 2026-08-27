/**
 * EVO chat output formatting — pure, unit-testable text transforms.
 *
 * OWNER 2026-08-27: the chat renderer is PLAIN TEXT + links (no markdown,
 * no LaTeX). Live evidence (owner screenshot) showed raw TeX reaching
 * users verbatim:  "V = \frac{4}{3}\pi\ r^{3}"  and  "2.2×10^{10}".
 * The system prompt now forbids LaTeX/markdown, but models occasionally
 * ignore prompt laws — these functions are the guaranteed floor.
 */

/** Common LaTeX symbol macros → readable unicode equivalents. */
const LATEX_SYMBOLS: Record<string, string> = {
  "\\pi": "π",
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\pm": "±",
  "\\approx": "≈",
  "\\leq": "≤",
  "\\geq": "≥",
  "\\neq": "≠",
  "\\alpha": "α",
  "\\beta": "β",
  "\\theta": "θ",
  "\\Delta": "Δ",
  "\\sum": "∑",
  "\\infty": "∞",
  "\\degree": "°",
};

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "(": "⁽",
  ")": "⁾",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

/**
 * Convert common LaTeX/TeX markup to readable plain text.
 * Handles the exact patterns seen in production chat answers:
 *   \frac{4}{3}\pi\ r^{3}  →  (4/3)π r³
 *   2.2×10^{10}            →  2.2×10¹⁰
 */
export function sanitizeLatexToPlain(text: string): string {
  let out = text;
  // \frac{a}{b} → (a/b)
  out = out.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1/$2)");
  // \sqrt{x} → √(x)
  out = out.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  // Symbol macros → unicode (split/join: no regex-escaping pitfalls)
  for (const [macro, symbol] of Object.entries(LATEX_SYMBOLS)) {
    out = out.split(macro).join(symbol);
  }
  // Spacing macros: "\ " "\," "\;" "\!" "\quad" "\qquad" → space
  out = out.replace(/\\[ ;,;!]/g, " ");
  out = out.split("\\quad").join(" ").split("\\qquad").join(" ");
  // Superscripts: x^{10} → x¹⁰ ; x^2 → x²
  out = out.replace(/\^\{([^{}]+)\}/g, (_m, g: string) =>
    [...g].map((c) => SUPERSCRIPTS[c] ?? c).join(""),
  );
  out = out.replace(/\^(\d)/g, (_m, d: string) => SUPERSCRIPTS[d] ?? d);
  // Subscripts: H_{2}O → H₂O ; H_2O → H₂O
  out = out.replace(/_\{([^{}]+)\}/g, (_m, g: string) =>
    [...g].map((c) => SUBSCRIPTS[c] ?? c).join(""),
  );
  out = out.replace(/_(\d)/g, (_m, d: string) => SUBSCRIPTS[d] ?? d);
  // Leftover math delimiters: \( \) \[ \] and display $$..$$ fences
  out = out.replace(/\\[()[\]]/g, "").replace(/\$\$/g, "");
  return out;
}

/**
 * Strip raw markdown the chat renderer cannot display (**bold**, headings,
 * horizontal rules) while keeping bullet lists and [label](url) link syntax
 * intact (links are rendered by MessageText in the widget).
 */
export function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1") // **bold** → bold
    .replace(/^#{1,6}[ \t]+/gm, "") // # headings
    // horizontal rules — consume the line AND its newline (no blank-line residue)
    .replace(/^[ \t]*([-*_])[ \t]*\1[ \t]*\1[ \t\-*_]*\n?/gm, "")
    .trim();
}
