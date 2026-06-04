function StatusBadge({ value }) {
  const normalized = String(value || "").toUpperCase();
  const styles = {
    VALID: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
    VERIFIED: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
    TRUE: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
    PENDING: "bg-amber-500/20 text-amber-300 ring-amber-400/30",
    TAMPERED: "bg-red-500/20 text-red-300 ring-red-400/30",
  };
  const style = styles[normalized] || styles.TAMPERED;

  return (
    <span
      className={`inline-flex min-w-24 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style}`}
    >
      {normalized}
    </span>
  );
}

export default StatusBadge;
