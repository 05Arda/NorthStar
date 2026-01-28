// src/extension.ts
import * as vscode from "vscode";
import { SidebarProvider } from "./sidebar/SidebarProvider";
import { COMMANDS, VIEW_ID } from "./constants";

// Command handlers
import { explainSelection } from "./commands/explainSelection";
import { generateComment } from "./commands/generateComment";
import { explainFile } from "./commands/explainFile";

/**
 * Entry point for the NorthStar AI extension.
 * This function is called when the extension is activated (as defined in package.json).
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize the singleton instance of the Sidebar Provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  // Register the Webview View Provider for the sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, sidebarProvider),
  );

  // Initialize and register all available extension commands
  registerExtensionCommands(context, sidebarProvider);

  console.log("NorthStar AI is now active!");
}

/**
 * Registers all extension commands and binds them to their respective handlers.
 * @param context The extension context provided by VS Code.
 * @param provider The SidebarProvider instance to be used by the commands.
 */
function registerExtensionCommands(
  context: vscode.ExtensionContext,
  provider: SidebarProvider,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.EXPLAIN_CODE, () =>
      explainSelection(provider),
    ),
    vscode.commands.registerCommand(COMMANDS.GENERATE_COMMENT, () =>
      generateComment(provider),
    ),
    vscode.commands.registerCommand(COMMANDS.EXPLAIN_FILE, () =>
      explainFile(provider),
    ),
  );
}

/**
 * Cleanup method called when the extension is deactivated.
 */
export function deactivate() {
  // Perform any necessary cleanup here (e.g., closing socket connections)
}
