import {
  Briefcase,
  FileUp,
  LayoutDashboard,
  Link2,
  Scale,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cases", label: "Cases", icon: Briefcase },
  { id: "upload", label: "Upload Evidence", icon: FileUp },
  { id: "verify", label: "Verify Evidence", icon: ShieldCheck },
  { id: "custody", label: "Chain of Custody", icon: Link2 },
];

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/95 lg:flex">
      <div className="border-b border-slate-800 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Forensics CoC</p>
            <p className="text-xs text-slate-400">Evidence Management</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activePage === id || (id === "cases" && activePage === "case-details");
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
