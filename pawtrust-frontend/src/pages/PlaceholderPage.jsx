// Temporary page so the route table works before the real pages land (#6, #8, #10).
export default function PlaceholderPage({ title }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">PawTrust</h1>
        <p className="mt-2 text-slate-600">{title} — coming soon</p>
      </div>
    </main>
  );
}
