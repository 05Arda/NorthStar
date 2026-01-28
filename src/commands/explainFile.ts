import * as vscode from "vscode";
import { SidebarProvider } from "../sidebar/SidebarProvider";
import { FILE_ANALYSIS_PROMPT } from "../services/llm/prompts/fileanalysis";
import { COMMANDS } from "../constants";

export function explainFile(provider: SidebarProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  const { document } = editor;
  const fileContent = document.getText();

  if (fileContent) {
    vscode.commands.executeCommand(COMMANDS.FOCUS_VIEW);
    const prompt = FILE_ANALYSIS_PROMPT(document.uri.fsPath, fileContent);
    provider.handleExternalInput(prompt, false);
  }
}
