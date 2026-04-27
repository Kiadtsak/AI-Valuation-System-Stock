'use client';

/**
 * Minimal markdown renderer for AI-generated content.
 * Supports: # ## ### headers, **bold**, *italic*, `code`, --- hr, - / * bullets
 * (Lightweight — no need for a full MD library)
 */

interface Props {
  text: string;
}

export function Markdown({ text }: Props) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${key}`} className="space-y-2 my-4 ml-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-3 text-[var(--text-secondary)] leading-relaxed">
            <span className="text-[var(--accent)] mt-1.5 text-xs">◆</span>
            <span className="flex-1" dangerouslySetInnerHTML={{ __html: inline(item) }} />
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList(String(i));
      elements.push(<div key={`hr-${i}`} className="divider-gold my-8" />);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList(String(i));
      elements.push(
        <h3 key={i} className="font-display text-xl mt-6 mb-3 text-[var(--text-primary)]">
          {line.slice(4)}
        </h3>
      );
      return;
    }
    if (line.startsWith('## ')) {
      flushList(String(i));
      elements.push(
        <h2 key={i} className="font-display text-3xl md:text-4xl mt-10 mb-4 leading-tight">
          <span dangerouslySetInnerHTML={{ __html: inline(line.slice(3)) }} />
        </h2>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList(String(i));
      elements.push(
        <h1 key={i} className="font-display text-5xl mt-12 mb-6 text-gold">
          {line.slice(2)}
        </h1>
      );
      return;
    }

    // Bullet
    if (/^[-*]\s+/.test(line.trim())) {
      listBuffer.push(line.trim().replace(/^[-*]\s+/, ''));
      return;
    }

    flushList(String(i));

    // Empty
    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-3" />);
      return;
    }

    // Italic wrap-around line (entire line is italic)
    if (/^\*.*\*$/.test(line.trim()) && !line.includes('**')) {
      elements.push(
        <p key={i} className="my-3 text-[var(--text-muted)] text-sm italic">
          {line.trim().slice(1, -1)}
        </p>
      );
      return;
    }

    // Paragraph
    elements.push(
      <p
        key={i}
        className="my-3 text-[var(--text-secondary)] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inline(line) }}
      />
    );
  });

  flushList('end');

  return <div className="max-w-3xl">{elements}</div>;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inline(s: string): string {
  let t = escapeHtml(s);
  // Bold
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>');
  // Italic
  t = t.replace(/\*(.+?)\*/g, '<em class="italic text-[var(--text-primary)]">$1</em>');
  // Inline code
  t = t.replace(
    /`(.+?)`/g,
    '<code class="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent)]">$1</code>'
  );
  return t;
}
