export function HomeGreeting({ name = "there" }: { name?: string }) {
  return (
    <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-inkDark">
      Start your day with a wonderful note, {name}.
    </h1>
  );
}
