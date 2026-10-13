// Temporary page body used by the scaffold. Delete once your page is real.
export function PlaceholderPage({
  title,
  owner,
  todo,
}: {
  title: string;
  owner: string;
  todo: string[];
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Owner: {owner}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {todo.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
