import StarRating from './StarRating';

// Finished tasks for the sitter, each with its review or "No review yet",
// and the average rating of the reviewed ones at the top.
export default function FinishedReviews({ tasks }) {
  const ratings = tasks.filter(task => task.review).map(task => task.review.rating);
  const average = ratings.length ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : null;

  if (tasks.length === 0) return <p className="text-sm text-slate-600">No finished tasks yet.</p>;
  return <>
    <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {average === null ? 'No ratings yet' : <span className="flex flex-wrap items-center gap-2"><span className="font-semibold">Average rating {average.toFixed(1)}</span><StarRating rating={average} /><span className="text-slate-500">({ratings.length} {ratings.length === 1 ? 'review' : 'reviews'})</span></span>}
    </div>
    <ul className="space-y-3">
      {tasks.map(task => <li key={task._id} className="min-w-0 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold">{task.petType} Care</h3>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">Finished</span>
        </div>
        <p className="mt-1 break-words text-sm text-slate-600">{task.location}</p>
        {task.review ? <div className="mt-2">
          <StarRating rating={task.review.rating} />
          {task.review.comment && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{task.review.comment}</p>}
        </div> : <p className="mt-2 text-sm text-slate-500">No review yet</p>}
      </li>)}
    </ul>
  </>;
}
