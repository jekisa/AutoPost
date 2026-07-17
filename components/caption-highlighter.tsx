"use client";

const tokenPattern = /([#@][\p{L}\p{N}_]+)/gu;

export function HighlightedCaption({ text, emptyText, className = "" }: { text: string; emptyText?: React.ReactNode; className?: string }) {
  if (!text) {
    return emptyText ? <span className={className}>{emptyText}</span> : null;
  }

  const parts = text.split(tokenPattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^[#@]/u.test(part)) {
          return (
            <span key={`${part}-${index}`} className="font-semibold text-sky-600 dark:text-sky-400">
              {part}
            </span>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </span>
  );
}
