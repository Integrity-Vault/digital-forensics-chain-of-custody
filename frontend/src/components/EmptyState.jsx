function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
