import { AlertCircle, CheckCircle2 } from "lucide-react";

function Alert({ type = "info", message }) {
  if (!message) {
    return null;
  }

  const isSuccess = type === "success";

  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        isSuccess ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-red-500/40 bg-red-500/10 text-red-200"
      }`}
      role="alert"
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
      <p>{message}</p>
    </div>
  );
}

export default Alert;
