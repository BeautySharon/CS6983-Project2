import { Link } from 'react-router-dom';

export const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100';
export const buttonClass = 'rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-wait disabled:opacity-60';
export const linkClass = 'font-medium text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function AuthLayout({ children }) {
  return <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-6 sm:py-10">
    <header className="mx-auto mb-6 max-w-md text-center">
      <Link to="/" className="inline-flex items-center gap-2 rounded-md text-3xl font-bold tracking-tight text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9 fill-current text-indigo-600"><ellipse cx="10" cy="14" rx="4" ry="6" transform="rotate(-25 10 14)"/><ellipse cx="19" cy="9" rx="4" ry="6"/><ellipse cx="29" cy="13" rx="4" ry="6" transform="rotate(25 29 13)"/><path d="M10 29c0-5 6-12 10-12s12 8 12 13c0 8-8 4-12 4s-10 3-10-5Z"/></svg>
        PawTrust
      </Link>
      <p className="mt-1 text-sm text-slate-600">Connect pet owners with trusted sitters.</p>
    </header>
    <section className="mx-auto w-full max-w-md rounded-2xl bg-white/80 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">{children}</section>
  </main>;
}
