import StatusBadge from "./StatusBadge";

function IntegrityBadges({ verification }) {
  if (!verification) {
    return null;
  }

  const items = [
    { label: "Uploaded File", value: verification.uploaded_file_integrity },
    { label: "Storage", value: verification.storage_integrity },
    { label: "Blockchain", value: verification.blockchain_integrity },
  ].filter((item) => item.value && item.value !== "NOT_CHECKED");

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
        >
          <span className="text-sm text-slate-200">{item.label} Integrity</span>
          <StatusBadge value={item.value === "VALID" ? "VALID" : "TAMPERED"} />
        </div>
      ))}
    </div>
  );
}

export default IntegrityBadges;
