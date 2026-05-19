import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFileViewStore } from "../stores/file-view-store";
import { usePiStore } from "../stores/pi-store";
import { Icon } from "./ember";

interface FileContent {
  text: string;
}

// ── Path resolution ────────────────────────────────────────────────────────

function resolvePath(filePath: string): string {
  // Absolute paths (Unix root or Windows drive letter)
  if (filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath)) {
    return filePath;
  }
  // Resolve relative to CWD
  const cwd = usePiStore.getState().cwd;
  if (cwd) {
    // Use forward slashes for consistency
    const base = cwd.replace(/\\/g, "/");
    const rel = filePath.replace(/\\/g, "/");
    return `${base}/${rel}`;
  }
  return filePath;
}

// ── Neutralino wrapper ──────────────────────────────────────────────────────

async function readFileContent(filePath: string): Promise<FileContent> {
  const resolved = resolvePath(filePath);

  // Try Neutralino first
  try {
    if (typeof Neutralino !== "undefined" && (Neutralino as any).filesystem) {
      const data = await (Neutralino as any).filesystem.readFile(resolved, { pos: 0 });
      return { text: data };
    }
  } catch {
    // Fall through to fetch
  }

  // Fallback: try a simple fetch for local dev without Neutralino
  const resp = await fetch(`file://${resolved}`);
  if (!resp.ok) throw new Error(`Failed to read ${filePath}: ${resp.status}`);
  return { text: await resp.text() };
}

// ── Markdown renderers (Ember-styled) ───────────────────────────────────────

function markdownComponents() {
  return {
    // Code blocks — mono, surface-sink background
    pre({ children, className, ...props }: any) {
      return (
        <pre className="md-pre" {...props}>
          {children}
        </pre>
      );
    },
    code({ children, className, inline, ...props }: any) {
      if (inline) {
        return (
          <code className="md-code-inline" {...props}>
            {children}
          </code>
        );
      }
      const lang = className?.replace("language-", "");
      return (
        <div className="md-code-block">
          {lang && <div className="md-code-lang">{lang}</div>}
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      );
    },
    // Inline code in headings / text
    h1({ children, ...props }: any) {
      return (
        <h1 className="md-h1" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, ...props }: any) {
      return (
        <h2 className="md-h2" {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, ...props }: any) {
      return (
        <h3 className="md-h3" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, ...props }: any) {
      return (
        <h4 className="md-h4" {...props}>
          {children}
        </h4>
      );
    },
    p({ children, ...props }: any) {
      return (
        <p className="md-p" {...props}>
          {children}
        </p>
      );
    },
    ul({ children, ...props }: any) {
      return (
        <ul className="md-ul" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }: any) {
      return (
        <ol className="md-ol" {...props}>
          {children}
        </ol>
      );
    },
    li({ children, ...props }: any) {
      return (
        <li className="md-li" {...props}>
          {children}
        </li>
      );
    },
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="md-blockquote" {...props}>
          {children}
        </blockquote>
      );
    },
    a({ children, href, ...props }: any) {
      return (
        <a className="md-link" href={href} target="_blank" rel="noopener" {...props}>
          {children}
        </a>
      );
    },
    hr(props: any) {
      return <hr className="md-hr" {...props} />;
    },
    table({ children, ...props }: any) {
      return (
        <div className="md-table-wrap">
          <table className="md-table" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...props }: any) {
      return (
        <th className="md-th" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }: any) {
      return (
        <td className="md-td" {...props}>
          {children}
        </td>
      );
    },
    img({ src, alt, ...props }: any) {
      return <img className="md-img" src={src} alt={alt} {...props} />;
    },
    strong({ children, ...props }: any) {
      return (
        <strong className="md-strong" {...props}>
          {children}
        </strong>
      );
    },
    em({ children, ...props }: any) {
      return (
        <em className="md-em" {...props}>
          {children}
        </em>
      );
    },
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export function MarkdownViewer() {
  const openFile = useFileViewStore((s) => s.openFile);
  const recentFiles = useFileViewStore((s) => s.recentFiles);
  const open = useFileViewStore((s) => s.open);

  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const components = useMemo(() => markdownComponents(), []);

  useEffect(() => {
    if (!openFile) {
      setContent(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    readFileContent(openFile.path)
      .then(({ text }) => {
        if (cancelled) return;
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to read file");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [openFile?.path]);

  // ── Empty state: no file selected ──
  if (!openFile) {
    return (
      <div className="md-viewer md-viewer--empty">
        <div className="md-empty">
          <div className="md-empty-icon">
            <Icon.File width={28} height={28} />
          </div>
          <p className="md-empty-title">No file open</p>
          <p className="md-empty-hint">
            Click a markdown file in the transcript to preview it here.
          </p>
          {recentFiles.length > 0 && (
            <div className="md-recent">
              <div className="md-recent-label">Recent</div>
              {recentFiles.slice(0, 8).map((f) => (
                <button
                  key={f.path}
                  className="md-recent-item"
                  onClick={() => open(f.path)}
                >
                  <Icon.File width={12} height={12} />
                  <span>{f.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="md-viewer md-viewer--loading">
        <div className="loading-spinner" />
        <p>Loading {openFile.filename}…</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="md-viewer md-viewer--error">
        <p className="md-error-title">Failed to read file</p>
        <p className="md-error-path">{openFile.path}</p>
        <p className="md-error-detail">{error}</p>
      </div>
    );
  }

  // ── Rendered markdown ──
  return (
    <div className="md-viewer">
      <div className="md-file-info">
        <Icon.File width={12} height={12} />
        <span className="md-file-name">{openFile.filename}</span>
        <span className="md-file-path">{openFile.path}</span>
      </div>
      <div className="md-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
}
