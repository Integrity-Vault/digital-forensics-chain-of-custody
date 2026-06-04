import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import CustodyTimeline from "../components/CustodyTimeline";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage, getCaseDashboard } from "../services/api";

function CaseDetails({ caseId, onBack, onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const dashboard = await getCaseDashboard(caseId);
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
  }, [caseId, onNotify]);

  if (loading) {
    return <LoadingSpinner label="Loading case dashboard..." />;
  }

  if (error || !data?.case) {
    return (
      <div>
        <button type="button" onClick={onBack} className="mb-4 text-sm text-blue-400">
          ← Back to cases
        </button>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "Case not found."}
        </div>
      </div>
    );
  }

  const caseInfo = data.case;
  const integrityLabel =
    data.case_integrity_status === "SECURE"
      ? "VALID"
      : data.case_integrity_status === "COMPROMISED"
        ? "TAMPERED"
        : "PENDING";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </button>

      <PageHeader
        title={caseInfo.case_name}
        subtitle={`${caseInfo.case_id} · Lead: ${caseInfo.investigator_name} · Opened ${caseInfo.created_at}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Evidence Items", value: data.evidence_count },
          { label: "Verified", value: data.verified_evidence_count },
          { label: "Tampering Alerts", value: data.tampering_alerts },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Case Integrity</p>
          <div className="mt-2">
            <StatusBadge value={integrityLabel} />
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Evidence in Case</h2>
        {!data.evidence?.length ? (
          <p className="text-sm text-slate-400">No evidence attached to this case yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Blockchain</th>
                  <th className="px-4 py-3">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {data.evidence.map((item) => (
                  <tr key={item.evidence_id} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-medium text-white">{item.evidence_name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.file_name}</td>
                    <td className="px-4 py-3 text-slate-400">{item.uploaded_at}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.blockchain_registered ? "Registered" : "Pending"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={item.integrity_status === "VALID" ? "VALID" : "TAMPERED"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Chain of Custody</h2>
        <CustodyTimeline events={data.chain_of_custody ?? []} />
      </section>
    </div>
  );
}

export default CaseDetails;
