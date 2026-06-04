import { useEffect, useState } from "react";
import CustodyTimeline from "../components/CustodyTimeline";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage, getCaseCustody, listCases } from "../services/api";

function ChainOfCustody({ onNotify, initialCaseId = "" }) {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState(initialCaseId);
  const [manualId, setManualId] = useState(initialCaseId);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listCases()
      .then((data) => setCases(data.cases || []))
      .catch(() => setCases([]));
  }, []);

  useEffect(() => {
    if (initialCaseId) {
      setCaseId(initialCaseId);
      setManualId(initialCaseId);
    }
  }, [initialCaseId]);

  const loadTimeline = async (targetId) => {
    const id = (targetId || caseId || manualId).trim();
    if (!id) {
      setError("Enter or select a case ID.");
      return;
    }

    setLoading(true);
    setError("");
    setTimeline(null);
    try {
      const data = await getCaseCustody(id);
      setTimeline(data);
      setCaseId(id);
      onNotify("success", "Chain of custody loaded.");
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      onNotify("error", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCaseId) {
      loadTimeline(initialCaseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Chain of Custody"
        subtitle="Complete audit trail of every action performed on case evidence — visible, timestamped, and attributable."
      />

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Select Case</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={caseId}
              onChange={(e) => {
                setCaseId(e.target.value);
                setManualId(e.target.value);
              }}
            >
              <option value="">Choose case</option>
              {cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>
                  {item.case_id} — {item.case_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Or Enter Case ID</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="CASE-2026-001"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadTimeline()}
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load Timeline"}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}
      </section>

      {loading && <LoadingSpinner label="Loading chain of custody..." />}

      {timeline && !loading && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-xl font-semibold text-white">{timeline.case?.case_name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {timeline.case?.case_id} · Investigator: {timeline.case?.investigator_name}
            </p>
          </div>
          <CustodyTimeline events={timeline.events ?? []} />
        </section>
      )}
    </div>
  );
}

export default ChainOfCustody;
