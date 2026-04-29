export type AlertStatus = "RESOLVED" | "UNRESOLVED";

export type AlertRow = {
  id: string;
  cameraLabel: string; // site label / fallback text
  event: string; // fire detected
  picture: string; // image url
  cameraName: string; // device name / fallback
  status: AlertStatus;
  timestamp: string; // ISO string
};
