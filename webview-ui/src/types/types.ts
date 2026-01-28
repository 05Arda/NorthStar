// src/types/types.ts

export interface ScanData {
  file: string;
  percentage: number;
}

export interface ChatMessage {
  role: "user" | "ai" | "assistant";
  text: string;
  isThinking?: boolean;
  type?: "text" | "action-card" | "scan-progress";
  scanData?: ScanData;
}
