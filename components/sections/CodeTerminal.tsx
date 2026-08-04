"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SNIPPET = [
  { t: "comment", text: "// prompt: build a pricing card" },
  { t: "tag", text: "<section" },
  { t: "attr", text: ' class="card">' },
  { t: "tag", text: "  <h3>" },
  { t: "plain", text: "Pro Plan" },
  { t: "tag", text: "</h3>" },
  { t: "tag", text: "  <p>" },
  { t: "plain", text: "₦250,000" },
  { t: "tag", text: "</p>" },
  { t: "tag", text: "</section>" },
];

const COLORS: Record<string, string> = {
  comment: "text-mist/70",
  tag: "text-signal-400",
  attr: "text-violet-400",
  plain: "text-white",
};

/**
 * Types the snippet line-by-line, then swaps to a small rendered
 * preview — the visual argument for the whole course: you can watch
 * AI produce this, and still know exactly what every line does.
 */
export function CodeTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisibleLines(SNIPPET.length);
      setShowPreview(true);
      return;
    }

    if (visibleLines < SNIPPET.length) {
      const id = setTimeout(() => setVisibleLines((n) => n + 1), 220);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setShowPreview(true), 500);
    return () => clearTimeout(id);
  }, [visibleLines]);

  return (
    <div className="glass-panel w-full max-w-md overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-xs text-mist">index.html</span>
      </div>

      <div className="min-h-[220px] p-5 font-mono text-[13px] leading-6">
        {!showPreview ? (
          <div aria-live="polite">
            {SNIPPET.slice(0, visibleLines).map((line, i) => (
              <div key={i} className={COLORS[line.t]}>
                {line.text}
                {i === visibleLines - 1 && (
                  <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-[2px] animate-blink bg-signal-400" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-lg bg-signal-violet text-center"
          >
            <p className="font-body text-sm font-medium text-white/80">Pro Plan</p>
            <p className="font-display text-2xl font-semibold text-white">₦250,000</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
