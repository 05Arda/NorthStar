import * as vscode from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { OllamaClient } from "../services/llm/ollamaClient";
import { ProjectScanner } from "../services/scanner/projectScanner";
import { ANALYSIS_PROMPT } from "../services/llm/prompts/analysis";
import { CHAT_SYSTEM_PROMPT } from "../services/llm/prompts/chat";
import { COMMENT_PROMPT } from "../services/llm/prompts/comment";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  private _ollama: OllamaClient;

  private _isReady: boolean = false;
  private _isGenerating: boolean = false;
  private _abortController: AbortController | null = null;

  // FIX 2: Eksik olan property tanımını buraya ekledik
  private _pendingInsertion?: {
    comment: string;
    editor: vscode.TextEditor;
    position: vscode.Position;
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {
    this._ollama = new OllamaClient();
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    this._isReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "webviewReady": {
          this._isReady = true;

          const config = vscode.workspace.getConfiguration("northstar");
          const savedModel = config.get<string>("defaultModel");
          const history = this._context.globalState.get("chatHistory") || [];

          webviewView.webview.postMessage({
            command: "loadInitialState",
            history: history,
            selectedModel: savedModel,
          });

          if (this._isGenerating) {
            webviewView.webview.postMessage({
              command: "setLoading",
              value: true,
            });
          }
          break;
        }

        case "getModels": {
          const models = await this._ollama.getInstalledModels();
          webviewView.webview.postMessage({
            command: "setModels",
            value: models,
          });
          break;
        }

        case "chat": {
          if (!data.text) return;

          // Save preference if model is selected
          if (data.model) {
            await vscode.workspace
              .getConfiguration("northstar")
              .update(
                "defaultModel",
                data.model,
                vscode.ConfigurationTarget.Global,
              );
          }

          await this._processQuery(data.text, true, data.model);
          break;
        }

        case "stopGeneration": {
          if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
            this._isGenerating = false;

            this._view?.webview.postMessage({
              command: "setLoading",
              value: false,
            });
            this._view?.webview.postMessage({ command: "streamEnd" });
          }
          break;
        }

        case "analyze": {
          const folders = vscode.workspace.workspaceFolders;
          if (!folders || folders.length === 0) {
            webviewView.webview.postMessage({
              command: "authError",
              text: "⚠️ Please open a project folder in VS Code to start the analysis.",
            });
            return;
          }

          this._isGenerating = true;

          try {
            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: "NorthStar: Scanning project...",
                cancellable: false,
              },
              async () => {
                const scanner = new ProjectScanner();

                const fileTree = await scanner.scanWorkspace(
                  (currentFile, percentage) => {
                    webviewView.webview.postMessage({
                      command: "scanProgress",
                      data: {
                        file: currentFile,
                        percentage: percentage,
                      },
                    });
                  },
                );

                webviewView.webview.postMessage({
                  command: "scanProgress",
                  data: { file: "Generating AI Analysis...", percentage: 100 },
                });

                const prompt = ANALYSIS_PROMPT(fileTree);
                const response = await this._ollama.generate(prompt);

                webviewView.webview.postMessage({
                  command: "receiveResponse",
                  text: response,
                });
              },
            );
          } catch (error) {
            console.error(error);
            webviewView.webview.postMessage({
              command: "receiveResponse",
              text: "❌ Error during analysis.",
            });
          } finally {
            this._isGenerating = false;
          }
          break;
        }

        case "clearHistory": {
          await this._context.globalState.update("chatHistory", []);
          webviewView.webview.postMessage({ command: "historyCleared" });
          break;
        }

        case "onInfo": {
          if (!data.value) return;
          vscode.window.showInformationMessage(data.value);
          break;
        }

        case "onError": {
          if (!data.value) return;
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  public async generateCodeComment(editor: vscode.TextEditor) {
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    const languageId = editor.document.languageId;
    const commentAbortController = new AbortController();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "NorthStar: Generating clean comment...",
        cancellable: true,
      },
      async (progress, token) => {
        token.onCancellationRequested(() => commentAbortController.abort());

        try {
          const prompt = COMMENT_PROMPT(text, languageId);
          let fullText = "";
          let backticks = 0;

          await this._ollama.generateStreaming(
            prompt,
            "",
            (chunk) => {
              fullText += chunk;
              // Count total backticks to trigger early exit
              backticks += (chunk.match(/```/g) || []).length;
              if (backticks >= 2) {
                commentAbortController.abort();
              }
            },
            commentAbortController.signal,
          );

          // --- THE SURGICAL CLEANING PIPELINE ---
          const match = fullText.match(/```[a-z]*\s*([\s\S]*?)(?:```|$)/i);
          let cleaned = (match ? match[1] : fullText).trim();

          cleaned = cleaned.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");

          const normalizedOriginal = text.trim();
          const codeIndex = cleaned.indexOf(normalizedOriginal);

          if (codeIndex !== -1) {
            cleaned = cleaned.substring(0, codeIndex).trim();
          }

          cleaned = cleaned
            .replace(/^(Certainly!|Here is|Sure,|I've added).*\n?/gi, "")
            .trim();

          // FIX 2: _pendingInsertion is now defined in the class
          this._pendingInsertion = {
            comment: cleaned,
            editor,
            position: selection.start,
          };

          if (this._view) {
            this._view.webview.postMessage({
              command: "proposeComment",
              comment: cleaned,
            });
            vscode.commands.executeCommand("northstar.sidebarView.focus");
          }
        } catch (e: any) {
          if (e.name !== "AbortError") {
            vscode.window.showErrorMessage("NorthStar Error: " + e.message);
          }
        }
      },
    );
  }

  /**
   * Main method to handle queries with streaming, abort logic, and history persistence.
   * This version ensures that partial responses are saved even if interrupted.
   */
  private async _processQuery(
    text: string,
    showUserMessage: boolean,
    selectedModel?: string,
  ) {
    if (!this._view) return;

    // Initialize the AbortController for this specific request
    this._abortController = new AbortController();
    const currentSignal = this._abortController.signal;

    // Optionally show the user's message in the webview
    if (showUserMessage) {
      this._view.webview.postMessage({ command: "userMessage", text: text });
      await this._saveToHistory({ role: "user", text: text });
    }

    // Update UI state to show the AI is working
    this._isGenerating = true;
    this._view.webview.postMessage({ command: "streamStart" });

    // Variable to accumulate tokens as they arrive from the stream
    let fullResponse = "";

    try {
      await this._ollama.generateStreaming(
        text,
        CHAT_SYSTEM_PROMPT,
        (token) => {
          // Only process tokens if the user hasn't hit 'Stop'
          if (!currentSignal.aborted) {
            fullResponse += token; // Accumulate the response locally

            this._view?.webview.postMessage({
              command: "streamChunk",
              text: token,
            });
          }
        },
        currentSignal,
        selectedModel,
      );
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("NorthStar: Generation stopped by user.");
      } else {
        // Send the error message to the UI
        this._view.webview.postMessage({
          command: "receiveResponse",
          text: "Error: " + error.message,
        });
        // Append the error to the response for history context
        fullResponse += `\n\n[System Error: ${error.message}]`;
      }
    } finally {
      /** * PERSISTENCE GATEKEEPER:
       * Save the accumulated text to history even if the process was aborted
       * or an error occurred. This ensures partial data is never lost.
       */
      if (fullResponse.trim().length > 0) {
        await this._saveToHistory({ role: "ai", text: fullResponse });
      }

      // Reset the extension state for the next interaction
      this._isGenerating = false;
      this._abortController = null;
      this._view.webview.postMessage({ command: "streamEnd" });
    }
  }

  public async handleExternalInput(
    text: string,
    showUserMessage: boolean = true,
  ) {
    if (!this._view) {
      await vscode.commands.executeCommand("northstar.sidebarView.focus");
    }

    let attempts = 0;
    while (!this._isReady && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (this._view) {
      await this._processQuery(text, showUserMessage);
    }
  }

  private async _saveToHistory(message: { role: string; text: string }) {
    const history = this._context.globalState.get<any[]>("chatHistory") || [];
    history.push(message);
    if (history.length > 50) {
      history.shift();
    }
    await this._context.globalState.update("chatHistory", history);
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const stylesUri = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.js",
    ]);
    const nonce = getNonce();
    return /*html*/ `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>NorthStar</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>`;
  }
}
