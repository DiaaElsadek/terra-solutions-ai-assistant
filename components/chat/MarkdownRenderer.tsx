"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, ExternalLink, Info, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { renderNodesWithLucide, renderTextWithLucide } from "@/components/ui/RichText";
import {
  detectTextDirection,
  dirAlignClass,
  splitBilingualLines,
} from "@/lib/i18n/bidi";

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    return extractText(node.props.children);
  }
  return "";
}

function isSafeHttpUrl(href?: string): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href.trim()) || href.startsWith("/");
}

interface MarkdownRendererProps {
  content: string;
}

/**
 * Editorial Markdown renderer synchronized typographically with AIResponseRenderer
 * so streaming Markdown transitions seamlessly into structured UI blocks without jump.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="terra-markdown space-y-3 text-[14.5px] sm:text-[15px] leading-[1.72] text-ai-bubble-foreground break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <h1
                dir={dir}
                className={clsx(
                  "font-display text-lg font-bold text-foreground border-b border-border/75 pb-1.5 mt-4 first:mt-0 tracking-tight",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </h1>
            );
          },
          h2: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <h2
                dir={dir}
                className={clsx(
                  "font-display text-[15px] sm:text-base font-bold text-terra-gold-light mt-4 first:mt-0 tracking-tight",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </h2>
            );
          },
          h3: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <h3
                dir={dir}
                className={clsx(
                  "font-display text-sm font-semibold text-primary mt-3 first:mt-0",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </h3>
            );
          },
          h4: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <h4
                dir={dir}
                className={clsx(
                  "font-display text-sm font-semibold text-foreground mt-2.5",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </h4>
            );
          },
          p: ({ children }) => {
            const textStr = extractText(children);
            const dir = detectTextDirection(textStr, "ltr");
            if (typeof children === "string") {
              const lines = splitBilingualLines(children, dir);
              if (lines.length > 1) {
                return (
                  <div className="space-y-1.5">
                    {lines.map((line, i) => (
                      <p
                        key={i}
                        dir={line.dir}
                        className={clsx("leading-[1.72]", dirAlignClass(line.dir))}
                      >
                        {renderTextWithLucide(line.text, line.dir)}
                      </p>
                    ))}
                  </div>
                );
              }
            }
            return (
              <p dir={dir} className={clsx("leading-[1.72]", dirAlignClass(dir))}>
                {renderNodesWithLucide(children, dir)}
              </p>
            );
          },
          ul: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <ul
                dir={dir}
                className={clsx(
                  "list-disc ps-5 space-y-1.5 marker:text-primary/80",
                  dirAlignClass(dir)
                )}
              >
                {children}
              </ul>
            );
          },
          ol: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <ol
                dir={dir}
                className={clsx(
                  "list-decimal ps-5 space-y-1.5 marker:text-primary/80",
                  dirAlignClass(dir)
                )}
              >
                {children}
              </ol>
            );
          },
          li: ({ children }) => {
            const textStr = extractText(children);
            const dir = detectTextDirection(textStr, "ltr");
            if (typeof children === "string") {
              const lines = splitBilingualLines(children, dir);
              if (lines.length > 1) {
                return (
                  <li dir={dir} className={clsx("leading-[1.68] space-y-1", dirAlignClass(dir))}>
                    {lines.map((line, i) => (
                      <span
                        key={i}
                        dir={line.dir}
                        className={clsx("block", dirAlignClass(line.dir))}
                      >
                        {renderTextWithLucide(line.text, line.dir)}
                      </span>
                    ))}
                  </li>
                );
              }
            }
            return (
              <li dir={dir} className={clsx("leading-[1.68]", dirAlignClass(dir))}>
                {renderNodesWithLucide(children, dir)}
              </li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {renderNodesWithLucide(children)}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-foreground-muted not-italic font-medium">
              {renderNodesWithLucide(children)}
            </em>
          ),
          a: ({ href, children }) => {
            if (!isSafeHttpUrl(href)) {
              return <span className="text-terra-gold-pale">{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-hover hover:decoration-primary transition-colors"
              >
                <span>{renderNodesWithLucide(children)}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            );
          },
          blockquote: ({ children }) => {
            const textStr = extractText(children);
            const dir = detectTextDirection(textStr, "ltr");
            const isDanger = /contraindic|prohibit|not allowed|ممنوع|موانع|تحذير/i.test(
              textStr
            );
            const isWarning = /warning|unavailable|not available|missing|تنبيه|غير متوفر|السعر/i.test(
              textStr
            );
            return (
              <blockquote
                dir={dir}
                className={clsx(
                  dirAlignClass(dir),
                  isDanger
                    ? "rounded-xl border border-red-500/35 border-s-2 border-s-red-400 bg-red-500/[0.09] px-4 py-3 text-xs sm:text-[13.5px] text-red-100 my-3 flex items-start gap-2.5"
                    : isWarning
                    ? "rounded-xl border border-amber-500/30 border-s-2 border-s-amber-400 bg-amber-500/10 px-4 py-3 text-xs sm:text-[13.5px] text-amber-100 my-3 flex items-start gap-2.5"
                    : "rounded-xl border border-primary/35 border-s-2 border-s-primary bg-primary/[0.08] px-4 py-3 text-xs sm:text-[13.5px] text-terra-gold-light my-3 flex items-start gap-2.5"
                )}
              >
                {isDanger ? (
                  <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 leading-[1.68]">
                  {renderNodesWithLucide(children, dir)}
                </div>
              </blockquote>
            );
          },
          hr: () => <hr className="border-border/55 my-4" />,
          pre: ({ children }) => (
            <pre
              dir="ltr"
              className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-[#120E08] p-3.5 text-xs text-terra-gold-light text-left leading-relaxed terra-subtle-shadow"
            >
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return <code className="font-mono text-xs text-terra-gold-light">{children}</code>;
            }
            return (
              <code
                dir="ltr"
                className="rounded bg-background-secondary px-1.5 py-0.5 font-mono text-xs text-primary border border-border/80"
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => {
            const tableDir = detectTextDirection(extractText(children), "ltr");
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-[#120E08] terra-subtle-shadow">
                <table
                  dir={tableDir}
                  className={clsx("w-full text-[13px] border-collapse", dirAlignClass(tableDir))}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ children }) => (
            <thead className="bg-[#1B150B] text-terra-gold-pale border-b border-border/85">
              {children}
            </thead>
          ),
          tr: ({ children }) => (
            <tr className="odd:bg-transparent even:bg-white/[0.015] hover:bg-background-tertiary/55 transition-colors duration-100">
              {children}
            </tr>
          ),
          th: ({ children }) => {
            const dir = detectTextDirection(extractText(children), "ltr");
            return (
              <th
                dir={dir}
                className={clsx(
                  "px-3.5 py-2.5 text-[11px] font-display font-semibold tracking-wide whitespace-nowrap",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </th>
            );
          },
          td: ({ children }) => {
            const textStr = extractText(children);
            const dir = detectTextDirection(textStr, "ltr");
            return (
              <td
                dir={dir}
                className={clsx(
                  "px-3.5 py-2.5 border-t border-border/45 align-top leading-relaxed text-terra-gold-light",
                  dirAlignClass(dir)
                )}
              >
                {renderNodesWithLucide(children, dir)}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
