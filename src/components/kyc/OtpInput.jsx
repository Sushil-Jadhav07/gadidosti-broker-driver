import { useRef } from "react";

// 6 separate boxes instead of one text field — standard OTP pattern: typing a digit
// auto-advances focus, Backspace on an empty box steps back, and pasting the full code
// (e.g. from a notification) fills every box at once.
export default function OtpInput({ value, onChange, length = 6, disabled, autoFocus }) {
  const inputsRef = useRef([]);

  const setDigitAt = (index, digit) => {
    const next = value.padEnd(length, " ").split("");
    next[index] = digit;
    onChange(next.join("").trimEnd());
  };

  const handleChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    setDigitAt(index, digit);
    if (digit && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    onChange(digits);
    inputsRef.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className="w-full aspect-square max-w-11 text-center text-lg font-bold font-mono rounded-xl border-2 border-slate-200 bg-white text-slate-900
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60 disabled:bg-slate-50"
        />
      ))}
    </div>
  );
}
