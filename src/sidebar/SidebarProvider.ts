import * as vscode from "vscode";
import { OllamaClient } from "../services/llm/ollamaClient";
import { WebviewCommand, IWebViewMessageSender } from "./types";
import { ViewGenerator } from "./utils/ViewGenerator";
import { ChatHandler } from "./handlers/ChatHandler";
import { AnalysisHandler } from "./handlers/AnalysisHandler";
import { CommentHandler } from "./handlers/CommentHandler";

export class SidebarProvider
  implements vscode.WebviewViewProvider, IWebViewMessageSender
{
  _view?: vscode.WebviewView;
  private _ollama: OllamaClient;
  private _isWebviewReady: boolean = false;

  // Handlers (Logic Layers)
  private _chatHandler?: ChatHandler;
  private _analysisHandler?: AnalysisHandler;
  private _commentHandler?: CommentHandler;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {
    this._ollama = new OllamaClient();
  }

  // ==========================================================================
  // IWebViewMessageSender Implementation
  // Enables Handlers to send messages to the UI.
  // ==========================================================================
  public postMessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  // ==========================================================================
  // Webview Lifecycle & Initialization
  // ==========================================================================
  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    this._isWebviewReady = false;

    // Initialize Handlers (Dependency Injection)
    this._chatHandler = new ChatHandler(this._ollama, this, this._context);
    this._analysisHandler = new AnalysisHandler(this._ollama, this);
    this._commentHandler = new CommentHandler(this._ollama, this);

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Delegate HTML generation to ViewGenerator
    webviewView.webview.html = ViewGenerator.getHtmlForWebview(
      webviewView.webview,
      this._extensionUri,
    );

    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this._routeMessage(message);
    });
  }

  /**
   * Updates the reference when the panel is closed and reopened (revived).
   */
  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  // ==========================================================================
  // External Interfaces (Methods called by Extension.ts)
  // ==========================================================================

  /**
   * Generates a comment for the selected code (Triggered via context menu or command palette).
   */
  public async generateCodeComment(editor: vscode.TextEditor) {
    // If the Sidebar is closed, ensure it opens/focuses first
    if (!this._view) {
      await vscode.commands.executeCommand("northstar.sidebarView.focus");
    }

    // Wait for the Handler to be ready (might need a short delay if just opened)
    if (this._commentHandler) {
      await this._commentHandler.generateComment(editor);
    } else {
      vscode.window.showErrorMessage("NorthStar: Sidebar is not ready yet.");
    }
  }

  /**
   * Handles external chat inputs (e.g., Quick Question via shortcut).
   */
  public async handleExternalInput(
    text: string,
    showUserMessage: boolean = true,
  ) {
    if (!this._view) {
      await vscode.commands.executeCommand("northstar.sidebarView.focus");
    }

    // Ensure the Webview (React) side is fully loaded
    let attempts = 0;
    while (!this._isWebviewReady && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (this._chatHandler) {
      // Process the message via the Handler
      await this._chatHandler.handleChat(text, undefined, showUserMessage);
    }
  }

  // ==========================================================================
  // Message Router (Distributes incoming messages)
  // ==========================================================================
  private async _routeMessage(message: any) {
    switch (message.command) {
      case WebviewCommand.WebviewReady:
        this._isWebviewReady = true;
        const config = vscode.workspace.getConfiguration("northstar");
        const history = this._context.globalState.get("chatHistory") || [];

        this.postMessage({
          command: "loadInitialState",
          history,
          selectedModel: config.get<string>("defaultModel"),
        });
        break;

      case WebviewCommand.GetModels:
        const models = await this._ollama.getInstalledModels();
        this.postMessage({ command: "setModels", value: models });
        break;

      case WebviewCommand.Chat:
        await this._chatHandler?.handleChat(message.text, message.model);
        break;

      case WebviewCommand.StopGeneration:
        this._chatHandler?.stopGeneration();
        break;

      case WebviewCommand.ClearHistory:
        await this._chatHandler?.clearHistory();
        break;

      case WebviewCommand.Analyze:
        await this._analysisHandler?.analyzeProject();
        break;

      case WebviewCommand.OnInfo:
        vscode.window.showInformationMessage(message.value);
        break;

      case WebviewCommand.OnError:
        vscode.window.showErrorMessage(message.value);
        break;
    }
  }
}
