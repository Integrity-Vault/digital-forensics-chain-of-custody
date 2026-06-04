import { useState } from "react";
import { CheckCircle2, Menu, X, XCircle } from "lucide-react";
import Sidebar from "./components/Sidebar";
import CaseDetails from "./pages/CaseDetails";
import Cases from "./pages/Cases";
import ChainOfCustody from "./pages/ChainOfCustody";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Verify from "./pages/Verify";

const MOBILE_NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "cases", label: "Cases" },
  { id: "upload", label: "Upload" },
  { id: "verify", label: "Verify" },
  { id: "custody", label: "Custody" },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [custodyCaseId, setCustodyCaseId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const handleNotify = (type, message) => {
    if (!message) {
      return;
    }
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  };

  const openCase = (caseId) => {
    setSelectedCaseId(caseId);
    setActivePage("case-details");
    setMobileNavOpen(false);
  };

  const openCustody = (caseId = "") => {
    setCustodyCaseId(caseId);
    setActivePage("custody");
    setMobileNavOpen(false);
  };

  const navigate = (page) => {
    setActivePage(page);
    setMobileNavOpen(false);
    if (page !== "case-details") {
      setSelectedCaseId("");
    }
    if (page !== "custody") {
      setCustodyCaseId("");
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            onNotify={handleNotify}
            onNavigate={navigate}
            onOpenCase={openCase}
          />
        );
      case "cases":
        return <Cases onNotify={handleNotify} onOpenCase={openCase} />;
      case "case-details":
        return (
          <CaseDetails
            caseId={selectedCaseId}
            onBack={() => navigate("cases")}
            onNotify={handleNotify}
          />
        );
      case "upload":
        return <Upload onNotify={handleNotify} />;
      case "verify":
        return <Verify onNotify={handleNotify} />;
      case "custody":
        return (
          <ChainOfCustody
            onNotify={handleNotify}
            initialCaseId={custodyCaseId}
          />
        );
      default:
        return (
          <Dashboard
            onNotify={handleNotify}
            onNavigate={navigate}
            onOpenCase={openCase}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar activePage={activePage} onNavigate={navigate} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-bold text-white">Forensics CoC</p>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="rounded-lg border border-slate-700 p-2 text-slate-200"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {mobileNavOpen && (
            <nav className="flex flex-wrap gap-2 border-t border-slate-800 px-4 py-3">
              {MOBILE_NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    activePage === item.id
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="animate-[fadeIn_220ms_ease-out]">{renderPage()}</div>
        </main>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-xl ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-red-500/40 bg-red-500/15 text-red-200"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
