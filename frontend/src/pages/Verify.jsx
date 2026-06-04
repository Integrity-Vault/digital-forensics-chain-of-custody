import { useEffect, useState } from "react";
import Alert from "../components/Alert";
import FileDropzone from "../components/FileDropzone";
import IntegrityBadges from "../components/IntegrityBadges";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  getApiErrorMessage,
  getCaseDashboard,
  listCases,
  verifyEvidenceById,
  verifyEvidenceWithFile,
} from "../services/api";

function Verify({ onNotify }) {
  const [cases, setCases] = useState([]);
  const [evidenceOptions, setEvidenceOptions] = useState([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingMode, setLoadingMode] = useState("");
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    listCases()
      .then((data) => setCases(data.cases || []))
      .catch(() => setCases([]));
  }, []);

  useEffect(() => {
    if (!caseId) {
      setEvidenceOptions([]);
      setSelectedEvidenceId("");
      return;
    }

    const loadEvidence = async () => {
      setLoadingEvidence(true);
      try {
        const data = await getCaseDashboard(caseId);
        setEvidenceOptions(data.evidence || []);
        setSelectedEvidenceId("");
      } catch {
        setEvidenceOptions([]);
      } finally {
        setLoadingEvidence(false);
      }
    };

    loadEvidence();
  }, [caseId]);

  const resetForm = () => {
    setSelectedEvidenceId("");
    setPerformedBy("");
    setSelectedFile(null);
    setResult(null);
    setError("");
    setPickerKey((prev) => prev + 1);
  };

  const runQuickVerify = async () => {
    if (!selectedEvidenceId) {
      setError("Select case and evidence to verify.");
      return;
    }
    setLoadingMode("quick");
    setError("");
    setResult(null);
    try {
      const data = await verifyEvidenceById(selectedEvidenceId, performedBy.trim() || "Investigator");
      setResult({ mode: "quick", ...data });
      onNotify("success", "Storage and blockchain verification completed.");
    } catch (verifyError) {
      const message = getApiErrorMessage(verifyError);
      setError(message);
      onNotify("error", message);
    } finally {
      setLoadingMode("");
    }
  };

  const runFullVerify = async () => {
    if (!selectedEvidenceId) {
      setError("Select case and evidence to verify.");
      return;
    }
    if (!selectedFile) {
      setError("Select the evidence file for full three-layer verification.");
      return;
    }
    setLoadingMode("full");
    setError("");
    setResult(null);
    try {
      const data = await verifyEvidenceWithFile(
        selectedEvidenceId,
        selectedFile,
        performedBy.trim() || "Investigator"
      );
      setResult({ mode: "full", ...data });
      onNotify("success", "Full integrity verification completed.");
    } catch (verifyError) {
      const message = getApiErrorMessage(verifyError);
      setError(message);
      onNotify("error", message);
    } finally {
      setLoadingMode("");
    }
  };

  const isLoading = Boolean(loadingMode);
  const overallStatus = result?.overall_integrity === "VALID" ? "VALID" : "TAMPERED";

  return (
    <div>
      <PageHeader
        title="Verify Evidence"
        subtitle="Independent checks: uploaded file, server storage, and blockchain integrity. Storage tampering is detected even when the original file is supplied."
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Case</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select case</option>
              {cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>
                  {item.case_id} — {item.case_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Evidence</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={selectedEvidenceId}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              disabled={isLoading || loadingEvidence || !caseId}
            >
              <option value="">Select evidence item</option>
              {evidenceOptions.map((item) => (
                <option key={item.evidence_id} value={item.evidence_id}>
                  {item.evidence_name} ({item.file_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="performed-by">
              Verified By
            </label>
            <input
              id="performed-by"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              type="text"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="Officer Sharma"
              disabled={isLoading}
            />
          </div>
        </div>

        {loadingEvidence && (
          <div className="mt-4">
            <LoadingSpinner label="Loading case evidence..." />
          </div>
        )}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-200">Evidence File (full verify)</label>
          <FileDropzone
            key={pickerKey}
            id="verify-file"
            disabled={isLoading}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            helperText="Required for full verify — compares uploaded file, disk storage, and blockchain."
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runQuickVerify}
            disabled={isLoading}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {loadingMode === "quick" ? "Verifying..." : "Quick Verify (Storage + Blockchain)"}
          </button>
          <button
            type="button"
            onClick={runFullVerify}
            disabled={isLoading}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
          >
            {loadingMode === "full" ? "Verifying..." : "Full Verify (All 3 Checks)"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Clear
          </button>
        </div>

        <Alert type="error" message={error} />

        {result && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {result.evidence_name || "Evidence"} — {result.case_id}
                </h3>
                <p className="text-xs text-slate-400">Verification complete · custody events recorded</p>
              </div>
              <StatusBadge value={overallStatus} />
            </div>
            <IntegrityBadges verification={result} />
            {result.storage_integrity === "TAMPERED" && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Tampering alert: stored evidence on disk does not match the registered integrity record.
              </p>
            )}
            {result.uploaded_file_integrity === "TAMPERED" && (
              <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Tampering alert: uploaded file does not match the registered integrity record.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Verify;
