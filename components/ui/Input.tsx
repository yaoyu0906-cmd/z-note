import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full border border-line rounded px-2.5 py-1.5 text-sm bg-white text-ink placeholder:text-graphite outline-none focus:border-accent dark:border-lineDark dark:bg-surfaceDark dark:text-inkDark dark:placeholder:text-graphiteDark dark:focus:border-accentDark ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
