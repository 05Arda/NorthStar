import * as vscode from "vscode";
import { OllamaClient } from "../../services/llm/ollamaClient";
import { CHAT_SYSTEM_PROMPT } from "../../services/llm/prompts/chat";
import { IWebViewMessageSender } from "../types";

export class ChatHandler {
  private _abortController: AbortController | null = null;

  constructor(
    private readonly _ollama: OllamaClient,
    private readonly _sender: IWebViewMessageSender,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  public async handleChat(
    text: string,
    model?: string,
    showUserMessage: boolean = true,
  ) {
    // Model ayarını güncelle
    if (model) {
      await vscode.workspace
        .getConfiguration("northstar")
        .update("defaultModel", model, vscode.ConfigurationTarget.Global);
    }

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    // Kullanıcı mesajını UI'a yansıt ve kaydet
    if (showUserMessage) {
      this._sender.postMessage({ command: "userMessage", text });
      await this._saveToHistory({ role: "user", text });
    }

    this._sender.postMessage({ command: "streamStart" });
    let fullResponse = "";

    try {
      await this._ollama.generateStreaming(
        text,
        CHAT_SYSTEM_PROMPT,
        (token) => {
          if (!signal.aborted) {
            fullResponse += token;
            this._sender.postMessage({ command: "streamChunk", text: token });
          }
        },
        signal,
        model,
      );
    } catch (error: any) {
      if (error.name !== "AbortError") {
        this._sender.postMessage({
          command: "receiveResponse",
          text: "Error: " + error.message,
        });
      }
    } finally {
      if (fullResponse.trim().length > 0) {
        await this._saveToHistory({ role: "ai", text: fullResponse });
      }
      this._sender.postMessage({ command: "streamEnd" });
      this._abortController = null;
    }
  }

  public stopGeneration() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
      this._sender.postMessage({ command: "streamEnd" });
    }
  }

  public async clearHistory() {
    await this._context.globalState.update("chatHistory", []);
    this._sender.postMessage({ command: "historyCleared" });
  }

  private async _saveToHistory(message: { role: string; text: string }) {
    const history = this._context.globalState.get<any[]>("chatHistory") || [];
    history.push(message);
    if (history.length > 50) history.shift();
    await this._context.globalState.update("chatHistory", history);
  }
}
