import { useRef, useState } from "react";
const action =
  "rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50";

export default function OwnerApplications({ task, applications, onAccept }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const triggers = useRef({});
  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await onAccept(task._id, selected._id);
      setSelected(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`applications-${task._id}`}
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span>Applications ({applications.length})</span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div
          id={`applications-${task._id}`}
          className="mt-2 divide-y divide-slate-100"
        >
          {applications.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-500">
              No applications yet.
            </p>
          )}
          {applications.map((application) => (
            <div
              key={application._id}
              className="flex flex-wrap items-start gap-3 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-900">
                  {application.sitterName}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {application.message || "No message provided."}
                </p>
              </div>
              {application.status === "accepted" ? (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                  Accepted
                </span>
              ) : application.status === "rejected" ? (
                <span className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                  Not selected
                </span>
              ) : (
                task.status === "open" && (
                  <button
                    ref={(node) => {
                      triggers.current[application._id] = node;
                    }}
                    aria-label={`Accept ${application.sitterName}`}
                    disabled={pending}
                    onClick={() => {
                      setSelected(application);
                      setError("");
                    }}
                    className={`${action} bg-indigo-600 text-white hover:bg-indigo-700`}
                  >
                    Accept
                  </button>
                )
              )}
            </div>
          ))}
          {selected && task.status === "open" && (
            <div
              role="group"
              aria-label="Confirm sitter acceptance"
              className="rounded-lg bg-indigo-50 p-3"
            >
              <p className="text-sm text-slate-700">
                Accept {selected.sitterName}? Other applicants will not be
                selected.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  autoFocus
                  disabled={pending}
                  onClick={() => {
                    const id = selected._id;
                    setSelected(null);
                    setError("");
                    triggers.current[id]?.focus();
                  }}
                  className={`${action} bg-white text-slate-700 ring-1 ring-slate-300`}
                >
                  Cancel
                </button>
                <button
                  disabled={pending}
                  onClick={confirm}
                  className={`${action} bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                  {pending ? "Accepting…" : "Confirm accept"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-800">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
