import * as vscode from "vscode";
import { SidebarProvider } from "../sidebar/SidebarProvider";

export async function generateComment(provider: SidebarProvider) {
  const editor =
    vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0];

  if (!editor) {
    vscode.window.showErrorMessage("Please click into a code file first.");
    return;
  }

  await provider.generateCodeComment(editor);
}
