import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full border border-line rounded px-2.5 py-1.5 text-sm bg-white text-ink placeholder:text-graphite outline-none focus:border-accent ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
