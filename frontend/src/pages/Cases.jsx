import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { createCase, getApiErrorMessage, listCases } from "../services/api";

function Cases({ onNotify, onOpenCase }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    caseId: "",
    caseName: "",
    investigatorName: "",
  });

  const loadCases = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listCases();
      setCases(data.cases || []);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      onNotify("error", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return cases;
    }
    return cases.filter(
      (item) =>
        item.case_id.toLowerCase().includes(query) ||
        item.case_name.toLowerCase().includes(query) ||
        item.investigator_name.toLowerCase().includes(query)
    );
  }, [cases, search]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.caseId.trim() || !form.caseName.trim() || !form.investigatorName.trim()) {
      setError("All case fields are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createCase({
        caseId: form.caseId.trim(),
        caseName: form.caseName.trim(),
        investigatorName: form.investigatorName.trim(),
      });
      setForm({ caseId: "", caseName: "", investigatorName: "" });
      setShowForm(false);
      onNotify("success", "Case created successfully.");
      await loadCases();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      onNotify("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Case Management"
        subtitle="Criminal cases must exist before evidence can be collected and attached."
        action={
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            <Plus className="h-4 w-4" />
            New Case
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">Create Investigation Case</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="CASE-2026-001"
              value={form.caseId}
              onChange={(e) => setForm({ ...form, caseId: e.target.value })}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Case Name"
              value={form.caseName}
              onChange={(e) => setForm({ ...form, caseName: e.target.value })}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Investigator Name"
              value={form.investigatorName}
              onChange={(e) => setForm({ ...form, investigatorName: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Case"}
          </button>
        </form>
      )}

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white"
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No cases found"
          message="Create an investigation case before uploading forensic evidence."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Create First Case
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Case Name</th>
                <th className="px-4 py-3">Investigator</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.case_id} className="border-t border-slate-800 bg-slate-900/50">
                  <td className="px-4 py-3 font-medium text-blue-300">{item.case_id}</td>
                  <td className="px-4 py-3 text-white">{item.case_name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.investigator_name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.evidence_count ?? 0}</td>
                  <td className="px-4 py-3 text-slate-400">{item.created_at}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenCase(item.case_id)}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                    >
                      Open Dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Cases;
