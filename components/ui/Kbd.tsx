export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-mono text-graphite">
      {children}
    </kbd>
  );
}
