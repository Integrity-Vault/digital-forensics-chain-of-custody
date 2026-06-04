import { CheckCheck, Shield, Upload } from "lucide-react";

function Navbar({ activePage, onNavigate }) {
  const navItemClass = (page) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      activePage === page
        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-10 mb-8 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/20 p-2 text-blue-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Digital Forensics CoC</p>
            <p className="text-xs text-slate-400">Secure Evidence Integrity Portal</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1">
          <button type="button" className={navItemClass("upload")} onClick={() => onNavigate("upload")}>
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </span>
          </button>
          <button type="button" className={navItemClass("verify")} onClick={() => onNavigate("verify")}>
            <span className="inline-flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Verify
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;

