export default function NotFound() {
  return (
    <main className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-2">404</h1>
        <p className="text-gray-500 mb-4">Page not found</p>
        <a href="/" className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-bold">Go to Dashboard</a>
      </div>
    </main>
  );
}
