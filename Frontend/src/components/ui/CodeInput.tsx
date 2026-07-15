"use client";

import { useRef } from "react";

// Six individual boxes instead of one text field — auto-advances on type,
// supports backspace-to-previous and pasting the full code at once.
export default function CodeInput({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setDigit = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").slice(0, 6));
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, char);
    if (char && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`h-14 w-11 rounded-xl border bg-zinc-50 text-center text-xl font-bold text-foreground transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 disabled:opacity-60 sm:h-16 sm:w-12 ${
            error ? "border-red-400" : "border-black/[.12] focus:border-[#5B4FE9]"
          }`}
        />
      ))}
    </div>
  );
}
