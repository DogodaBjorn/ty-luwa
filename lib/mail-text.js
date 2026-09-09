// De tekstversie van een mail. Dit is wat een lezer zonder opmaak krijgt, en
// wat lokaal in de terminal verschijnt. Geen tweederangs versie dus: dezelfde
// feiten, alleen met streepjes en inspringen in plaats van kleur.

const WIDTH = 72;

/** Regels afbreken op woordgrens, bestaande regeleindes respecterend. */
function wrap(text, width = WIDTH, indent = "") {
  const out = [];
  for (const paragraph of String(text == null ? "" : text).split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!line) line = word;
      else if ((line + " " + word).length + indent.length <= width) line += " " + word;
      else {
        out.push(indent + line);
        line = word;
      }
    }
    if (line) out.push(indent + line);
  }
  return out.join("\n");
}

function renderFacts(rows, indent = "") {
  const width = Math.max(...rows.map((r) => r.label.length));
  return rows
    .map((r) => {
      const label = indent + r.label.padEnd(width + 2, " ");
      const value = wrap(r.value, WIDTH - label.length, "")
        .split("\n")
        .join("\n" + " ".repeat(label.length));
      return label + value;
    })
    .join("\n");
}

function renderBlock(b) {
  switch (b.type) {
    case "h":
      return `${b.text}\n${(b.level === 1 ? "=" : "-").repeat(Math.min(b.text.length, WIDTH))}`;
    case "eyebrow":
      return b.text.toUpperCase();
    case "p":
      return wrap(b.text);
    case "facts":
      return (b.caption ? `${b.caption}\n` : "") + renderFacts(b.rows);
    case "notice": {
      const mark = b.tone === "warn" ? "! " : "  ";
      const head = b.title ? `${mark}${b.title}` : "";
      const body = (b.lines || []).map((l) => wrap(l, WIDTH - 4, "    ")).join("\n");
      const rows = b.rows && b.rows.length ? renderFacts(b.rows, "    ") : "";
      return [head, body, rows].filter(Boolean).join("\n");
    }
    case "quote":
      return wrap(b.text, WIDTH - 2)
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "code":
      // Vier spaties ervoor: zo staat de code op een eigen regel en is hij
      // met de hand over te typen.
      return `    ${b.text}`;
    case "button":
      return `→ ${b.label}\n  ${b.href}`;
    case "divider":
      return "-".repeat(WIDTH);
    case "footer":
      return `--\n${b.lines.map((l) => wrap(l)).join("\n\n")}`;
    default:
      return "";
  }
}

function renderText(document) {
  const parts = [];
  for (const b of document.blocks) {
    if (b.type === "quote" && b.caption) parts.push(b.caption);
    parts.push(renderBlock(b));
  }
  return parts.filter((s) => s !== "").join("\n\n") + "\n";
}

module.exports = { renderText, wrap };
