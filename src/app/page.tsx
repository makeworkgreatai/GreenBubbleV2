export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">GreenBubble</h1>
        <p className="text-muted-foreground text-lg">
          Election Day Polling Location Tracker
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <div className="w-4 h-4 rounded-full bg-bubble-done" title="Done" />
          <div className="w-4 h-4 rounded-full bg-bubble-pending" title="Pending" />
          <div className="w-4 h-4 rounded-full bg-bubble-empty border" title="Not started" />
        </div>
        <p className="text-sm text-muted-foreground pt-2">
          Phase 1 foundation running. Login coming in Phase 2.
        </p>
      </div>
    </main>
  );
}
