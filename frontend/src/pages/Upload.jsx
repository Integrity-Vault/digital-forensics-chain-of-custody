import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Alert from "../components/Alert";
import FileDropzone from "../components/FileDropzone";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage, listCases, uploadEvidence } from "../services/api";

function Upload({ onNotify }) {
  const [cases, setCases] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const [form, setForm] = useState({
    caseId: "",
    evidenceName: "",
    description: "",
    performedBy: "",
  });

  useEffect(() => {
    listCases()
      .then((data) => setCases(data.cases || []))
      .catch(() => setCases([]));
  }, []);

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    setError("");
    setPickerKey((prev) => prev + 1);
  };

  const handleUpload = async () => {
    if (!form.caseId) {
      setError("Select an existing case before uploading evidence.");
      return;
    }
    if (!form.evidenceName.trim()) {
      setError("Evidence name is required.");
      return;
    }
    if (!form.performedBy.trim()) {
      setError("Officer name is required for chain of custody.");
      return;
    }
    if (!selectedFile) {
      setError("Please choose a file to upload.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await uploadEvidence({
        caseId: form.caseId,
        evidenceName: form.evidenceName.trim(),
        description: form.description.trim(),
        performedBy: form.performedBy.trim(),
        file: selectedFile,
      });
      setResult(data);
      onNotify("success", "Evidence uploaded and registered.");
      setSelectedFile(null);
      setPickerKey((prev) => prev + 1);
    } catch (uploadError) {
      const message = getApiErrorMessage(uploadError);
      setError(message);
      onNotify("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Upload Evidence"
        subtitle="Attach forensic evidence to an existing investigation case. Cases cannot be created during upload."
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Case</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={form.caseId}
              onChange={(e) => setForm({ ...form, caseId: e.target.value })}
              disabled={loading}
            >
              <option value="">Select existing case</option>
              {cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>
                  {item.case_id} — {item.case_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Evidence Name</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="e.g. CCTV_FrontGate.mp4"
              value={form.evidenceName}
              onChange={(e) => setForm({ ...form, evidenceName: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Performed By</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Officer Sharma"
              value={form.performedBy}
              onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Description</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Optional context"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-5">
          <FileDropzone
            key={pickerKey}
            id="upload-file"
            disabled={loading}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            helperText="Drag and drop evidence file, or click to select."
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {loading ? "Uploading..." : "Upload Evidence"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Clear
          </button>
        </div>

        <Alert type="error" message={error} />

        {result && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Evidence Registered</h3>
            </div>
            <p className="text-sm text-slate-200">
              <span className="font-semibold text-white">Evidence:</span> {result.evidence_name}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              <span className="font-semibold text-white">Case:</span> {result.case_id}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={result.blockchain_status === "Registered" ? "VALID" : "PENDING"} />
              <span className="text-xs text-slate-400">Chain of custody events recorded</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Upload;
