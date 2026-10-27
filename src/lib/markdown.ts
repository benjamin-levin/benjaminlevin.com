// Tiny markdown → HTML renderer. Just enough for the experience/project detail
// bodies (headers, bold, italic, code, lists, tables, links). Keeps the build
// dependency-free; we trust the candidate corpus content (no user input).

export type Subsection = {
  slug: string;
  title: string;
  body: string;
  teaser: string;
};

// Split a detail body on `###` headers. Body before the first `###` is the
// intro; each `###` opens a new subsection. Used by detail pages to build
// "On this page" navigation.
export function splitSubsections(body: string): { intro: string; sections: Subsection[] } {
  const lines = body.split("\n");
  const sections: Subsection[] = [];
  const introLines: string[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle === null) return;
    const sectionBody = currentLines.join("\n").trim();
    sections.push({
      slug: slugify(currentTitle!),
      title: currentTitle!,
      body: sectionBody,
      teaser: firstParagraphPlain(sectionBody),
    });
    currentTitle = null;
    currentLines = [];
  };

  for (const line of lines) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      currentTitle = m[1].trim();
      continue;
    }
    if (currentTitle === null) introLines.push(line);
    else currentLines.push(line);
  }
  flush();

  return { intro: introLines.join("\n").trim(), sections };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
}

function firstParagraphPlain(body: string): string {
  const paragraphs = body.split(/\n\s*\n/);
  for (const p of paragraphs) {
    const t = p.trim();
    if (!t) continue;
    if (t.startsWith("#") || t.startsWith("```") || t.startsWith("|") || t.startsWith("![")) continue;
    if (t.startsWith("-") || t.startsWith("*") || /^\d+\./.test(t)) continue;
    const plain = t
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length > 200 ? plain.slice(0, 197) + "…" : plain;
  }
  return "";
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  // Inline code first so other patterns don't eat backticks.
  // Callers always pass already-escape()d content (see renderMarkdown), so
  // the inner content is already HTML-safe — re-escaping here would
  // double-escape (e.g. `<plan>` → `&amp;lt;plan&amp;gt;` rendering as the
  // literal entity refs in the browser).
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // Image / video — must run before link, since both share the [...](...) tail.
  // Detects video by file extension; otherwise renders as <img>. Alt text can
  // start with `small:` / `medium:` / `tiny:` to opt the embed into a narrower
  // size class — useful for portrait clips that would otherwise dominate the
  // column. (Brackets in alt would terminate the markdown image regex, so the
  // size hint uses a colon prefix instead of `[…]`.)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
    let sizeClass = "";
    let altClean = alt;
    const sizeMatch = /^\s*(small|medium|tiny):\s+/.exec(alt);
    if (sizeMatch) {
      sizeClass = ` md-${isVideo ? "video" : "img"}-${sizeMatch[1]}`;
      altClean = alt.slice(sizeMatch[0].length);
    }
    const altSafe = String(altClean).replace(/"/g, "&quot;");
    if (isVideo) {
      return `<video src="${url}" autoplay controls muted loop playsinline preload="metadata" class="md-video${sizeClass}" aria-label="${altSafe}"></video>` +
        (altClean ? `<span class="md-caption">${altSafe}</span>` : "");
    }
    const image = `<img src="${url}" alt="${altSafe}" loading="lazy" class="md-img${sizeClass}" />`;
    const fullSize = url.startsWith("/media/case-studies/");
    return (fullSize ? `<a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Open figure at full size">${image}</a>` : image) +
      (altClean ? `<span class="md-caption">${altSafe}${fullSize ? ` <a class="md-full-size" href="${url}" target="_blank" rel="noopener noreferrer">Open full size ↗</a>` : ""}</span>` : "");
  });
  // Bold + italic
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: underline; text-decoration-color: rgba(99,102,241,0.4); text-underline-offset: 2px;">${text}</a>`);
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  const flushBlankRun = () => {
    while (i < lines.length && !lines[i].trim()) i++;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      i++;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escape(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(escape(h[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push("<hr />");
      i++;
      continue;
    }

    // Table (very simple — header | row | row…)
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1])) {
      const headers = line.split("|").map((c) => c.trim()).filter((_, k, arr) => k > 0 && k < arr.length - 1 || (k === 0 && arr[0].trim()) || (k === arr.length - 1 && arr[arr.length - 1].trim()));
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const cells = lines[i].split("|").map((c) => c.trim());
        // Strip leading/trailing empties from |…| pattern
        if (cells[0] === "") cells.shift();
        if (cells[cells.length - 1] === "") cells.pop();
        rows.push(cells);
        i++;
      }
      out.push('<div class="md-table-wrap" tabindex="0" role="region" aria-label="Data table"><table><thead><tr>' +
        headers.map((h) => `<th>${inline(escape(h))}</th>`).join("") +
        "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => `<td>${inline(escape(c))}</td>`).join("") + "</tr>").join("") +
        "</tbody></table></div>");
      continue;
    }

    // Directive block: `:::name` ... `:::` lets us embed structured static
    // components from inside markdown without writing raw HTML. Two flavors
    // currently shipped:
    //
    //   :::callout
    //   Body markdown — pull-quote highlight.
    //   :::
    //
    //   :::stats
    //   - 178 tests
    //   - 42 modules
    //   - 30M designs
    //   :::
    //
    // Unknown directive names render as a plain <aside> with the name as a
    // class — easy to extend later.
    if (/^:::([a-z][a-z0-9-]*)\s*$/.test(line)) {
      const name = (line.match(/^:::([a-z][a-z0-9-]*)\s*$/) || [])[1] || "block";
      i++;
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() !== ":::") {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing :::
      const inner = buf.join("\n");
      if (name === "stats") {
        // Each "- ..." or each non-empty line becomes a stat. If the line
        // contains a `·` separator, the part before `·` is the headline value
        // and the rest is a sub-label.
        const items = inner
          .split("\n")
          .map((l) => l.replace(/^\s*-\s+/, "").trim())
          .filter(Boolean);
        const cells = items.map((item) => {
          const idx = item.indexOf("·");
          if (idx > 0) {
            const head = item.slice(0, idx).trim();
            const rest = item.slice(idx + 1).trim();
            return `<div class="md-stat"><div class="md-stat-value">${inline(head)}</div><div class="md-stat-label">${inline(rest)}</div></div>`;
          }
          return `<div class="md-stat"><div class="md-stat-value">${inline(item)}</div></div>`;
        }).join("");
        out.push(`<div class="md-stats">${cells}</div>`);
      } else if (name === "callout") {
        out.push(`<aside class="md-callout">${renderMarkdown(inner)}</aside>`);
      } else if (name === "row") {
        // Side-by-side row — typically for portrait images that would
        // otherwise stack and dominate the column. Each child flexes equally.
        out.push(`<div class="md-row">${renderMarkdown(inner)}</div>`);
      } else if (name === "compare" || name === "comparison") {
        // Body shape:
        //   ### Left title
        //   Left body markdown
        //   ---
        //   ### Right title
        //   Right body markdown
        const halves = inner.split(/^---\s*$/m).map((s) => s.trim());
        const cols = halves.map((h) => `<div class="md-compare-col">${renderMarkdown(h)}</div>`).join("");
        out.push(`<div class="md-compare">${cols}</div>`);
      } else {
        out.push(`<aside class="md-${name}">${renderMarkdown(inner)}</aside>`);
      }
      continue;
    }

    // Image-only block: each ![alt](url) on its own line renders as its own
    // full-width block. Consecutive image lines stack vertically.
    if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
      while (i < lines.length && /^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[i])) {
        out.push(`<div class="md-block">${inline(lines[i].trim())}</div>`);
        i++;
      }
      continue;
    }

    // Unordered list — items can span multiple lines via indented continuation.
    if (/^\s*[-*]\s+/.test(line)) {
      const items = collectListItems(lines, i, /^\s*[-*]\s+(.*)$/);
      i = items.nextIdx;
      out.push("<ul>" + items.items.map((it) => `<li>${inline(escape(it))}</li>`).join("") + "</ul>");
      continue;
    }

    // Ordered list — same.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = collectListItems(lines, i, /^\s*\d+\.\s+(.*)$/);
      i = items.nextIdx;
      out.push("<ol>" + items.items.map((it) => `<li>${inline(escape(it))}</li>`).join("") + "</ol>");
      continue;
    }

    // Blockquote
    if (/^>\s*/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s*/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(escape(buf.join(" ")))}</blockquote>`);
      continue;
    }

    // Blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-empty lines, trimming each so
    // hard-wrapped markdown sources don't leak runs of indentation/spaces.
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s*/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].startsWith("```")
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(escape(buf.join(" ")))}</p>`);
    flushBlankRun();
  }

  return out.join("\n");
}

// Collect a contiguous list. `itemRe` captures the first line of an item;
// any subsequent indented line that isn't itself a list-item start is treated
// as a continuation of the current item. Returns the list's items and the
// next line index after the list ends.
function collectListItems(
  lines: string[],
  startIdx: number,
  itemRe: RegExp
): { items: string[]; nextIdx: number } {
  const items: string[] = [];
  let i = startIdx;
  let buf: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    items.push(buf.join(" ").replace(/\s+/g, " ").trim());
    buf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; break; }

    const m = itemRe.exec(line);
    if (m) {
      flush();
      buf.push(m[1].trim());
      i++;
      continue;
    }

    // Indented continuation of the current item (not a new item, not a header,
    // not a different list type).
    if (
      buf.length > 0 &&
      /^\s+/.test(line) &&
      !/^\s*[-*]\s+/.test(line) &&
      !/^\s*\d+\.\s+/.test(line)
    ) {
      buf.push(line.trim());
      i++;
      continue;
    }
    break;
  }
  flush();
  return { items, nextIdx: i };
}
