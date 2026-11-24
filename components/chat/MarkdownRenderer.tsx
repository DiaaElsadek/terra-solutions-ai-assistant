"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders structured AI responses (tables, lists, headings, callouts)
 * with bidirectional text support for mixed Arabic & English content.
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
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              dir="auto"
              className="font-display text-base font-bold text-primary mt-4 first:mt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              dir="auto"
              className="font-display text-sm font-semibold text-terra-gold-light mt-3 first:mt-0"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              dir="auto"
              className="font-display text-sm font-semibold text-foreground mt-2.5"
            >
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p dir="auto" className="leading-relaxed">
              {children}
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
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-foreground-muted not-italic font-medium">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote
              dir="auto"
              className="rounded-lg border-s-4 border-primary bg-primary/10 px-4 py-2.5 text-xs text-terra-gold-light my-3"
            >
              {children}
            </blockquote>
          ),
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
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              dir="auto"
              className="px-3 py-2 border-t border-border/60 align-top text-terra-gold-light"
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

