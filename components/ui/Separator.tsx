export function Separator({ className = "" }: { className?: string }) {
  return <div className={`border-t border-line dark:border-lineDark ${className}`} />;
}
