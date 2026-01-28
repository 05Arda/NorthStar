import React from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../types/types";

interface MessageItemProps {
  msg: ChatMessage;
  isLast: boolean;
  onUndo: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  isLast,
  onUndo,
}) => {
  const isAi = msg.role === "ai" || msg.role === "assistant";

  // 1. Render Action Card (e.g., "Comment Inserted")
  if (msg.type === "action-card" || msg.text === "action:comment-inserted") {
    return (
      <div className="action-card success">
        <div className="action-info">
          <span className="icon">✅</span>
          <span>Comment inserted into code</span>
        </div>
        {/* Show Undo only for the immediate last action */}
        {isLast && (
          <button className="undo-btn" onClick={onUndo}>
            Undo
          </button>
        )}
      </div>
    );
  }

  // 2. Render Scan Progress Bar
  if (msg.type === "scan-progress" && msg.scanData) {
    return (
      <div className="message-row ai">
        <div className="bubble loading-bubble">
          <div className="progress-container">
            <div className="progress-info">
              <span className="file-name">{msg.scanData.file}</span>
              <span className="percent">
                %{Math.round(msg.scanData.percentage)}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${msg.scanData.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Standard Text or Thinking Indicator
  return (
    <div className={`message-row ${isAi ? "ai" : "user"}`}>
      {isAi && msg.isThinking ? (
        <div className="bubble ai-bubble">
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        </div>
      ) : (
        <div className={`bubble ${isAi ? "ai" : "user"}`}>
          {isAi ? (
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          ) : (
            <span>{msg.text}</span>
          )}
        </div>
      )}
    </div>
  );
};
