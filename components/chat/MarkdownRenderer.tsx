"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Info } from "lucide-react";
import { renderNodesWithLucide } from "@/components/ui/RichText";

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    return extractText(node.props.children);
  }
  return "";
}

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders structured AI responses (tables, lists, headings, callouts)
 * with bidirectional text support and Lucide icons replacing inline emojis.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="terra-markdown space-y-3 text-sm leading-relaxed text-ai-bubble-foreground break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              dir="auto"
              className="font-display text-lg font-bold text-foreground border-b border-border pb-1.5 mt-4 first:mt-0"
            >
              {renderNodesWithLucide(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              dir="auto"
              className="font-display text-base font-bold text-primary mt-4 first:mt-0"
            >
              {renderNodesWithLucide(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              dir="auto"
              className="font-display text-sm font-semibold text-terra-gold-light mt-3 first:mt-0"
            >
              {renderNodesWithLucide(children)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              dir="auto"
              className="font-display text-sm font-semibold text-foreground mt-2.5"
            >
              {renderNodesWithLucide(children)}
            </h4>
          ),
          p: ({ children }) => (
            <p dir="auto" className="leading-relaxed">
              {renderNodesWithLucide(children)}
            </p>
          ),
          ul: ({ children }) => (
            <ul dir="auto" className="list-disc ps-5 space-y-1.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol dir="auto" className="list-decimal ps-5 space-y-1.5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li dir="auto" className="leading-relaxed">
              {renderNodesWithLucide(children)}
            </li>
          ),
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
          blockquote: ({ children }) => {
            const textStr = extractText(children);
            const isWarning = /warning|unavailable|notice|تنبيه|ملاحظة هامة/i.test(
              textStr
            );
            return (
              <blockquote
                dir="auto"
                className="rounded-lg border-s-4 border-primary bg-primary/10 px-4 py-2.5 text-xs text-terra-gold-light my-3 flex items-start gap-2"
              >
                {isWarning ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  {renderNodesWithLucide(children)}
                </div>
              </blockquote>
            );
          },
          hr: () => <hr className="border-border my-4" />,
          code: ({ children }) => (
            <code className="rounded bg-background-secondary px-1.5 py-0.5 font-mono text-xs text-primary border border-border">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-start border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-background-secondary text-primary border-b border-border">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th
              dir="auto"
              className="px-3 py-2.5 text-start font-display font-semibold whitespace-nowrap"
            >
              {renderNodesWithLucide(children)}
            </th>
          ),
          td: ({ children }) => (
            <td
              dir="auto"
              className="px-3 py-2 border-t border-border/60 align-top text-terra-gold-light"
            >
              {renderNodesWithLucide(children)}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
