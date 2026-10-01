export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-6 py-20 sm:px-8 lg:px-10">
      <div className="animate-pulse">
        <div className="h-7 w-36 rounded-full bg-muted" />
        <div className="mt-8 h-12 max-w-2xl rounded-lg bg-muted" />
        <div className="mt-4 h-6 max-w-xl rounded-lg bg-muted" />
      </div>
    </main>
  );
}
