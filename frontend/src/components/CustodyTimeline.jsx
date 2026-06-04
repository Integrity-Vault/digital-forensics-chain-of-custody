import {
  AlertTriangle,
  ArrowRightLeft,
  Download,
  Eye,
  FileUp,
  Link2,
  ShieldCheck,
  FolderPlus,
} from "lucide-react";

const ACTION_META = {
  CASE_CREATED: { label: "Case Created", icon: FolderPlus, color: "text-blue-400" },
  UPLOAD: { label: "Upload", icon: FileUp, color: "text-emerald-400" },
  VIEW: { label: "View", icon: Eye, color: "text-slate-300" },
  VERIFY: { label: "Verify", icon: ShieldCheck, color: "text-blue-300" },
  DOWNLOAD: { label: "Download", icon: Download, color: "text-slate-300" },
  TRANSFER: { label: "Transfer", icon: ArrowRightLeft, color: "text-amber-300" },
  BLOCKCHAIN_REGISTERED: { label: "Blockchain Registered", icon: Link2, color: "text-indigo-300" },
  TAMPER_DETECTED: { label: "Tamper Detected", icon: AlertTriangle, color: "text-red-400" },
};

function CustodyTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No chain of custody events recorded yet.</p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-slate-700 pl-6">
      {events.map((event, index) => {
        const meta = ACTION_META[event.action] || {
          label: event.action,
          icon: ShieldCheck,
          color: "text-slate-300",
        };
        const Icon = meta.icon;
        const isTamper = event.action === "TAMPER_DETECTED";

        return (
          <li key={event.event_id || `${event.action}-${index}`} className="relative pb-8 last:pb-0">
            <span
              className={`absolute -left-[1.65rem] flex h-8 w-8 items-center justify-center rounded-full border ${
                isTamper
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-slate-700 bg-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </span>
            <div
              className={`rounded-xl border px-4 py-3 ${
                isTamper
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${isTamper ? "text-red-300" : "text-white"}`}>
                  {meta.label}
                </p>
                <time className="text-xs text-slate-400">{event.timestamp}</time>
              </div>
              <p className="mt-1 text-sm text-slate-300">{event.performed_by}</p>
              {event.details && (
                <p className="mt-2 text-sm text-slate-400">{event.details}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default CustodyTimeline;
