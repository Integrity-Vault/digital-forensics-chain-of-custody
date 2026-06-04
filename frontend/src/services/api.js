import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  timeout: 20000,
});

const extractResponseData = (response) => response?.data?.data ?? {};

const normalizeDetailMessage = (detail) => {
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const parsed = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.msg) {
          return String(item.msg);
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return "";
};

export const getApiErrorMessage = (error) => {
  const payload = error?.response?.data;
  const message = payload?.message ?? payload?.data?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const detailMessage = normalizeDetailMessage(payload?.detail);
  if (detailMessage) {
    return detailMessage;
  }

  if (error?.message) {
    return error.message;
  }

  return "Unexpected error occurred. Please try again.";
};

export const getDashboard = async () => {
  const response = await apiClient.get("/dashboard");
  return extractResponseData(response);
};

export const listCases = async () => {
  const response = await apiClient.get("/cases");
  return extractResponseData(response);
};

export const createCase = async ({ caseId, caseName, investigatorName }) => {
  const formData = new FormData();
  formData.append("case_id", caseId);
  formData.append("case_name", caseName);
  formData.append("investigator_name", investigatorName);

  const response = await apiClient.post("/cases", formData);
  return extractResponseData(response);
};

export const getCaseDashboard = async (caseId) => {
  const response = await apiClient.get(`/cases/${encodeURIComponent(caseId)}`);
  return extractResponseData(response);
};

export const getCaseCustody = async (caseId) => {
  const response = await apiClient.get(`/cases/${encodeURIComponent(caseId)}/custody`);
  return extractResponseData(response);
};

export const uploadEvidence = async ({
  caseId,
  evidenceName,
  description,
  performedBy,
  file,
}) => {
  const formData = new FormData();
  formData.append("case_id", caseId);
  formData.append("evidence_name", evidenceName);
  formData.append("description", description || "");
  formData.append("performed_by", performedBy);
  formData.append("file", file);

  const response = await apiClient.post("/evidence/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return extractResponseData(response);
};

export const verifyEvidenceById = async (evidenceId, performedBy = "Investigator") => {
  const formData = new FormData();
  formData.append("evidence_id", evidenceId);
  formData.append("performed_by", performedBy);

  const response = await apiClient.post("/evidence/verify-id", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return extractResponseData(response);
};

export const verifyEvidenceWithFile = async (evidenceId, file, performedBy = "Investigator") => {
  const formData = new FormData();
  formData.append("evidence_id", evidenceId);
  formData.append("performed_by", performedBy);
  formData.append("file", file);

  const response = await apiClient.post("/evidence/verify-file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return extractResponseData(response);
};
