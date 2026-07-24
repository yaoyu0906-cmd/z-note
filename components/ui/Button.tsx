import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-line bg-white hover:bg-accentSoft text-ink",
  ghost: "text-graphite hover:bg-accentSoft hover:text-ink",
  danger: "text-red-600 border border-line hover:bg-red-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-2 py-1 rounded",
  md: "text-sm px-3 py-1.5 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
