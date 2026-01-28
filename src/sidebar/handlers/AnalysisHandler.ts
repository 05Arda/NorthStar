import * as vscode from "vscode";
import { OllamaClient } from "../../services/llm/ollamaClient";
import { ProjectScanner } from "../../services/scanner/projectScanner";
import { ANALYSIS_PROMPT } from "../../services/llm/prompts/analysis";
import { IWebViewMessageSender } from "../types";

export class AnalysisHandler {
  constructor(
    private readonly _ollama: OllamaClient,
    private readonly _sender: IWebViewMessageSender,
  ) {}

  public async analyzeProject() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this._sender.postMessage({
        command: "authError",
        text: "⚠️ Please open a project folder.",
      });
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "NorthStar: Scanning...",
          cancellable: false,
        },
        async () => {
          const scanner = new ProjectScanner();
          const fileTree = await scanner.scanWorkspace(
            (currentFile, percentage) => {
              this._sender.postMessage({
                command: "scanProgress",
                data: { file: currentFile, percentage },
              });
            },
          );

          this._sender.postMessage({
            command: "scanProgress",
            data: { file: "Generating Analysis...", percentage: 100 },
          });

          const prompt = ANALYSIS_PROMPT(fileTree);
          const response = await this._ollama.generate(prompt);

          this._sender.postMessage({
            command: "receiveResponse",
            text: response,
          });
        },
      );
    } catch (error: any) {
      this._sender.postMessage({
        command: "receiveResponse",
        text: "❌ Error during analysis.",
      });
    }
  }
}
