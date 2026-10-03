import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Plain text with http(s) links made clickable. Everything else stays text (no HTML injection). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            {part.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
