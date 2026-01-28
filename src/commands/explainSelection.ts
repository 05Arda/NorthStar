import * as vscode from "vscode";
import { SidebarProvider } from "../sidebar/SidebarProvider";
import { SELECTION_ANALYSIS_PROMPT } from "../services/llm/prompts/explainSelection";
import { COMMANDS } from "../constants";

export function explainSelection(provider: SidebarProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const { document, selection } = editor;
  const text = document.getText(selection);

  if (text) {
    vscode.commands.executeCommand(COMMANDS.FOCUS_VIEW);

    const prompt = SELECTION_ANALYSIS_PROMPT(
      document.uri.fsPath,
      document.getText(),
      text,
    );

    // false = do not show user message in the chat
    provider.handleExternalInput(prompt, false);
  }
}
