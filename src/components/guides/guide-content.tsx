"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFootnotes from "remark-footnotes";

interface GuideContentProps {
  content: string;
}

export function GuideContent({ content }: GuideContentProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkFootnotes, { inlineNotes: false }]]}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            // Render remote images via next/image with unoptimized flag for external URLs
            return (
              <span className="block my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt || ""}
                  className="rounded-lg max-w-full h-auto"
                />
              </span>
            );
          },
          a: ({ href, children, ...props }) => {
            if (!href) {
              return <>{children}</>;
            }

            const isInternalHash = href.startsWith("#");

            return (
              <a
                href={href}
                {...props}
                {...(!isInternalHash
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
