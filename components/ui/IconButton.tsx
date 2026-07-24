import { forwardRef, type ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // required for accessibility since there's no visible text
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, active = false, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors ${
          active
            ? "bg-accentSoft text-accent dark:bg-accentSoftDark dark:text-accentDark"
            : "text-graphite hover:bg-accentSoft hover:text-ink dark:text-graphiteDark dark:hover:bg-accentSoftDark dark:hover:text-inkDark"
        } ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
