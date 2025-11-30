"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <article className={cn("prose dark:prose-invert max-w-none prose-p:leading-7 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-purple-600 dark:prose-a:text-purple-400 hover:prose-a:text-purple-500 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl sm:text-3xl font-bold mt-6 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl sm:text-2xl font-bold mt-6 mb-3 text-foreground" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg sm:text-xl font-semibold mt-4 mb-2 text-foreground" {...props}>
              {children}
            </h3>
          ),

          // Paragraphs & Text
          p: ({ children, ...props }) => (
            <p className="mb-4 text-foreground/90 leading-7" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-foreground" {...props}>
              {children}
            </strong>
          ),

          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-1 text-foreground/90" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 text-foreground/90" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="pl-1" {...props}>
              {children}
            </li>
          ),

          // Custom Checkboxes for Task Lists
          input: ({ type, checked, ...props }) => {
            if (type === "checkbox") {
              return (
                <span className={cn(
                  "inline-flex items-center justify-center w-5 h-5 mr-2 rounded align-text-bottom transition-colors",
                  checked
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 border"
                )}>
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
              );
            }
            return <input type={type} checked={checked} {...props} />;
          },

          // Horizontal Rule
          hr: ({ ...props }) => (
            <hr className="my-6 border-gray-200 dark:border-gray-800" {...props} />
          ),

          // Code Blocks
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { ref, ...rest } = props;
            return match ? (
              <div className="rounded-xl overflow-hidden my-6 border border-gray-200 dark:border-gray-800 shadow-sm bg-[#1e1e1e]">
                <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
                  <span className="text-xs font-medium text-gray-300">{match[1]}</span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                  </div>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
                  {...rest}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-md px-1.5 py-0.5 text-sm font-mono font-medium border border-purple-100 dark:border-purple-800/30" {...rest}>
                {children}
              </code>
            );
          },

          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-4 bg-purple-50/30 dark:bg-purple-900/10 italic text-foreground/80 rounded-r-lg" {...props}>
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-900" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/90 border-t border-gray-200 dark:border-gray-800" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}