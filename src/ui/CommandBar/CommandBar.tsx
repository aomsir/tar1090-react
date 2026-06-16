export function CommandBar() {
  return (
    <header
      data-testid="command-bar"
      className="glass absolute left-4 right-4 top-3 flex h-11 items-center gap-3 px-4"
    >
      <span className="font-semibold">Live Traffic</span>
      <span className="text-muted ml-auto text-sm">0 aircraft · 0 msg/s</span>
    </header>
  );
}
