// src/extension.ts
import * as vscode from "vscode";
import { SidebarProvider } from "./panels/SidebarProvider";
import { FILE_ANALYSIS_PROMPT } from "./services/llm/prompts/fileanalysis";
import { SELECTION_ANALYSIS_PROMPT } from "./services/llm/prompts/explainSelection";

import { OllamaClient } from "./services/llm/ollamaClient";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "northstar.sidebarView",
      sidebarProvider,
    ),
  );
  console.log("NorthStar is now active!");

  // --- NEW: AUTO-START LOGIC ---
  //const ollama = new OllamaClient();

  // Check silently in the background without blocking startup
  /*ollama.ensureServerRunning().then((isRunning) => {
    if (!isRunning) {
      console.warn("Ollama could not be started automatically.");
    }
  });*/

  // --- COMMAND 1: EXPLAIN SELECTION ---
  context.subscriptions.push(
    vscode.commands.registerCommand("northstar.explainCode", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const filePath = editor.document.uri.fsPath;
      const fileContent = editor.document.getText();
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (text) {
        vscode.commands.executeCommand("northstar.sidebarView.focus");

        const prompt = SELECTION_ANALYSIS_PROMPT(filePath, fileContent, text);
        sidebarProvider.handleExternalInput(prompt, false);
      }
    }),
  );

  // --- COMMAND 2: REFACTOR SELECTION ---
  context.subscriptions.push(
    vscode.commands.registerCommand("northstar.refactorCode", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (text) {
        vscode.commands.executeCommand("northstar.sidebarView.focus");
        sidebarProvider.handleExternalInput(
          `Refactor this code to be cleaner and more efficient:\n\n\`\`\`\n${text}\n\`\`\``,
          false,
        );
      }
    }),
  );

  // --- Command 3: ADD COMMENT TO SELECTION ---
  context.subscriptions.push(
    vscode.commands.registerCommand("northstar.generateComment", async () => {
      // Look for the visible editor if activeTextEditor is undefined (common when sidebar is focused)
      let editor = vscode.window.activeTextEditor;

      if (!editor) {
        // Fallback: check visible editors
        editor = vscode.window.visibleTextEditors[0];
      }

      if (!editor) {
        vscode.window.showErrorMessage("Please click into a code file first.");
        return;
      }

      await sidebarProvider.generateCodeComment(editor);
    }),
  );

  // --- Command 3: EXPLAIN FILE ---

  context.subscriptions.push(
    vscode.commands.registerCommand("northstar.explainFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const fileContent = editor.document.getText();

      if (fileContent) {
        vscode.commands.executeCommand("northstar.sidebarView.focus");

        const prompt = FILE_ANALYSIS_PROMPT(filePath, fileContent);
        sidebarProvider.handleExternalInput(prompt, false);
      }
    }),
  );
}

export function deactivate() {}
