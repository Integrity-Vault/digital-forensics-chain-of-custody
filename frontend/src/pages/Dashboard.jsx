import { useEffect, useState } from "react";
import { AlertTriangle, Briefcase, FileStack, ShieldCheck } from "lucide-react";
import CustodyTimeline from "../components/CustodyTimeline";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage, getDashboard } from "../services/api";

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onNotify, onNavigate, onOpenCase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const dashboard = await getDashboard();
        setData(dashboard);
      } catch (err) {
        const message = getApiErrorMessage(err);
        setError(message);
        onNotify("error", message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [onNotify]);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Investigation Dashboard"
        subtitle="Overview of cases, evidence integrity, and recent chain of custody activity."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Cases" value={data?.total_cases ?? 0} icon={Briefcase} accent="bg-blue-500/15 text-blue-400" />
        <StatCard label="Total Evidence" value={data?.total_evidence ?? 0} icon={FileStack} accent="bg-indigo-500/15 text-indigo-400" />
        <StatCard
          label="Verified Evidence"
          value={data?.verified_evidence ?? 0}
          icon={ShieldCheck}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          label="Tampering Alerts"
          value={data?.tampering_alerts ?? 0}
          icon={AlertTriangle}
          accent="bg-red-500/15 text-red-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Cases</h2>
          {!data?.recent_cases?.length ? (
            <p className="text-sm text-slate-400">No cases yet. Create a case to begin an investigation.</p>
          ) : (
            <ul className="space-y-3">
              {data.recent_cases.map((item) => (
                <li
                  key={item.case_id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{item.case_name}</p>
                    <p className="text-xs text-slate-400">
                      {item.case_id} · {item.investigator_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCase(item.case_id)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onNavigate("cases")}
            className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            Manage all cases →
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Chain of Custody</h2>
          <CustodyTimeline events={data?.recent_activity ?? []} />
          <button
            type="button"
            onClick={() => onNavigate("custody")}
            className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            View full timeline →
          </button>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
