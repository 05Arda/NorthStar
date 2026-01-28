import { useState, useEffect, useRef } from "react";
import { vscode } from "./utilities/vscode";
import ReactMarkdown from "react-markdown";
import Mermaid from "./components/Mermaid";

import {
  IoSend,
  IoSquareOutline,
  IoTrashOutline,
  IoScanCircleOutline,
} from "react-icons/io5";

import { testMessage } from "./test";

import "./App.css";

// TİP TANIMLAMALARI (Unified Types)
interface ChatMessage {
  role: "user" | "ai" | "assistant";
  text: string;
  isThinking?: boolean; // Animasyon için
  type?: "text" | "action-card" | "scan-progress"; // Mesajın türü
  scanData?: { file: string; percentage: number }; // Scan verisi için
}

function App() {
  // --- STATE MANAGEMENT ---
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mesaj Geçmişi
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: testMessage(),
    },
  ]);

  // Review & Undo Logic
  const [lastActionUndoable, setLastActionUndoable] = useState(false);
  const [pendingComment, setPendingComment] = useState<string | null>(null);

  // Auto Scroll Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isStreamingRef = useRef(false);

  // Kullanıcı en altta mı kontrol et
  const isUserAtBottom = () => {
    if (!chatAreaRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
    // 50px tolerans - kullanıcı neredeyse en alttaysa true döner
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ DÜZELTİLMİŞ SCROLL LOGIC - Sadece kullanıcı en alttaysa scroll et
  useEffect(() => {
    // Kullanıcı manuel olarak yukarı kaydırmışsa scroll yapma
    if (!isUserAtBottom()) return;

    // 1. Yeni mesaj eklendiğinde scroll et
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    // 2. Streaming (isLoading) sırasında scroll et
    if (isLoading && isStreamingRef.current) {
      scrollToBottom();
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, isLoading]);

  // --- MESSAGE HANDLING ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "loadInitialState":
          if (message.selectedModel) {
            setSelectedModel(message.selectedModel);
          }
          setMessages(message.history || []);
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToBottom();
            }, 600);
          });
          break;

        case "setModels":
          setModels(message.value);
          break;

        case "setLoading":
          setIsLoading(message.value);
          break;

        case "userMessage":
          setMessages((prev) => [
            ...prev,
            { role: "user", text: message.text },
          ]);
          setIsLoading(true);
          setTimeout(() => scrollToBottom(), 100);
          break;

        // --- STREAMING LOGIC (Typing Indicator Inside Bubble) ---
        case "streamStart":
          setIsLoading(true);
          isStreamingRef.current = true; // Streaming başladı
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: "", isThinking: true }, // Boş, düşünen balon ekle
          ]);
          break;

        case "streamChunk":
          setMessages((prev) => {
            const newHistory = [...prev];
            const lastMsg = newHistory[newHistory.length - 1];

            if (lastMsg && lastMsg.role === "ai") {
              // İlk veri geldiğinde "Thinking" modundan çıkar
              if (lastMsg.isThinking) {
                lastMsg.isThinking = false;
              }

              let chunk = message.text;

              // <think> tag temizleme / formatlama
              if (chunk.includes("<think>")) {
                chunk = chunk.replace("<think>", "\n\n> **Thinking:**\n> ");
              }
              if (chunk.includes("</think>")) {
                chunk = chunk.replace("</think>", "\n\n---\n\n");
              }

              lastMsg.text += chunk;
            }
            return newHistory;
          });
          break;

        case "streamEnd":
          setIsLoading(false);
          isStreamingRef.current = false; // Streaming bitti
          setMessages((prev) => {
            const newHistory = [...prev];
            const lastMsg = newHistory[newHistory.length - 1];
            if (lastMsg?.isThinking) lastMsg.isThinking = false;
            return newHistory;
          });
          break;

        // --- PROGRESS & SCANNING ---
        case "scanProgress":
          // Scan sırasında sürekli yeni mesaj eklemek yerine son mesajı güncelleriz
          // Veya özel bir "scan-progress" mesajı yönetiriz.
          setIsLoading(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.type === "scan-progress") {
              // Var olan progress barı güncelle
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                scanData: message.data,
              };
              return updated;
            } else {
              // Yeni progress bar mesajı ekle
              return [
                ...prev,
                {
                  role: "ai",
                  text: "",
                  type: "scan-progress",
                  scanData: message.data,
                },
              ];
            }
          });
          break;

        case "receiveResponse":
          setIsLoading(false);
          // Eğer son mesaj scan-progress ise onu kaldırıp cevabı ekle, değilse direkt ekle
          setMessages((prev) => {
            const cleanHistory = prev.filter((m) => m.type !== "scan-progress");
            return [...cleanHistory, { role: "ai", text: message.text }];
          });
          break;

        // --- COMMENT ACTIONS ---
        case "proposeComment":
          setIsLoading(false);
          setPendingComment(message.comment);
          break;

        case "commentAccepted":
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "action:comment-inserted",
              type: "action-card",
            },
          ]);
          setPendingComment(null);
          setLastActionUndoable(true);
          break;

        case "undoSuccess":
          setLastActionUndoable(false);
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1].text = "↩️ **Insertion Undone**";
            next[next.length - 1].type = "text"; // Kart görünümünden çıkar
            return next;
          });
          break;

        case "historyCleared":
          setMessages([{ role: "ai", text: "Chat history cleared." }]);
          setPendingComment(null);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    // Initial commands
    vscode.postMessage({ command: "webviewReady" });
    vscode.postMessage({ command: "getModels" });

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // --- HANDLERS ---
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput("");
    vscode.postMessage({
      command: "chat",
      text: userMsg,
      model: selectedModel,
    });
  };

  const handleAnalyze = () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "🔍 Analyze Project" },
    ]);
    setIsLoading(true);
    vscode.postMessage({ command: "analyze" });
  };

  const handleClear = () => vscode.postMessage({ command: "clearHistory" });

  const handleStop = () => {
    vscode.postMessage({ command: "stopGeneration" });
    setIsLoading(false);
  };

  // ✅ DÜZELTİLEN KISIM: handleAccept
  const handleAccept = () => {
    if (pendingComment) {
      vscode.postMessage({
        command: "acceptComment",
        text: pendingComment, // Backend'e eklenecek metni gönderiyoruz
      });
    }
  };

  const handleReject = () => {
    vscode.postMessage({ command: "rejectComment" });
    setPendingComment(null);
  };

  const handleUndo = () => vscode.postMessage({ command: "undoComment" });

  // --- RENDER ---
  return (
    <div className="container">
      {/* Header */}
      <div className="header-actions">
        <span className="brand-title">NorthStar AI</span>
        <button
          className="icon-btn"
          onClick={handleClear}
          title="Clear History"
        >
          <IoTrashOutline size={16} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="chat-area" ref={chatAreaRef}>
        {messages.map((msg, index) => {
          const isAi = msg.role === "ai" || msg.role === "assistant";

          // 1. ACTION CARD RENDER (Inserted/Undo)
          if (
            msg.type === "action-card" ||
            msg.text === "action:comment-inserted"
          ) {
            return (
              <div key={index} className="action-card success">
                <div className="action-info">
                  <span className="icon">✅</span>
                  <span>Comment inserted into code</span>
                </div>
                {lastActionUndoable && index === messages.length - 1 && (
                  <button className="undo-btn" onClick={handleUndo}>
                    Undo
                  </button>
                )}
              </div>
            );
          }

          // 2. SCAN PROGRESS RENDER
          if (msg.type === "scan-progress" && msg.scanData) {
            return (
              <div key={index} className="message-row ai">
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

          // 3. STANDARD MESSAGE / TYPING INDICATOR RENDER
          return (
            <div key={index} className={`message-row ${isAi ? "ai" : "user"}`}>
              {/* AI "Düşünüyor" Modu */}
              {isAi && msg.isThinking ? (
                <div className="bubble ai-bubble">
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              ) : (
                /* Normal Mesaj */
                <div className={`bubble ${isAi ? "ai" : "user"}`}>
                  {isAi ? (
                    <ReactMarkdown
                      components={{
                        code(props) {
                          const { children, className, node, ...rest } = props;

                          // Regex kontrolünü basitleştirdik: İçinde 'mermaid' geçmesi yeterli
                          const isMermaid = /mermaid/i.test(className || "");

                          return isMermaid ? (
                            // Eşleşme varsa bizim Mermaid bileşenini çağır
                            <Mermaid chart={String(children).trim()} />
                          ) : (
                            // Eşleşme yoksa standart kod bloğu olarak göster
                            <code {...rest} className={className}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* REVIEW CARD (Pending Comment) */}
        {pendingComment && (
          <div className="review-card">
            <div className="review-header">
              <div className="review-title-group">
                <span className="icon">📝</span>
                <span className="review-title">Proposed Comment</span>
              </div>
            </div>
            <div className="review-content">
              <div className="code-preview">
                {pendingComment.split("\n").map((line, i) => (
                  <div key={i} className="code-line">
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <div className="review-actions">
              <button className="btn-reject" onClick={handleReject}>
                Discard
              </button>
              <button className="btn-accept" onClick={handleAccept}>
                Insert
              </button>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-wrapper">
        <div className="modern-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask NorthStar..."
            disabled={isLoading && !pendingComment} // Yorum beklerken input açık kalsın mı? Kapalı kalsın
          />

          <div className="input-actions-row">
            <div className="left-actions">
              <button
                className="action-chip"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                <IoScanCircleOutline size={16} style={{ marginRight: 4 }} />
                Analyze
              </button>
            </div>

            <div className="right-actions">
              <select
                className="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                ) : (
                  <option>No models</option>
                )}
              </select>

              <button
                className="send-icon-btn"
                onClick={isLoading ? handleStop : handleSend}
                title={isLoading ? "Stop" : "Send"}
                style={{
                  color: isLoading
                    ? "var(--vscode-errorForeground)"
                    : "var(--vscode-button-foreground)",
                }}
              >
                {isLoading ? (
                  <IoSquareOutline size={16} />
                ) : (
                  <IoSend size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
