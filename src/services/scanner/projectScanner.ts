import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Context object used to maintain state during a recursive workspace scan.
 */
interface ScanContext {
  rootPath: string;
  totalFiles: number;
  processedCount: number;
  onProgress: (message: string, percentage: number) => void;
}

export class ProjectScanner {
  // Use Sets for O(1) lookup performance
  private static readonly IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    ".vscode",
    ".idea",
    "assets",
    "coverage",
    ".next",
    "__tests__",
    "test",
    "tests",
  ]);

  private static readonly IGNORED_FILES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".prettierrc",
    ".eslintrc",
    ".gitignore",
  ]);

  private static readonly VALID_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".c",
    ".cpp",
    ".h",
    ".php",
    ".rb",
    ".cs",
    ".html",
    ".css",
    ".sql",
    ".prisma",
    ".dockerfile",
  ]);

  private static readonly MAX_DEPTH = 5;

  /**
   * Scans the current workspace to build a text-based file tree representation.
   * Responsible for counting files, updating progress, and filtering irrelevant files.
   * * @param onProgress - Callback triggered to update the UI with scanning progress.
   * @returns A string representing the folder structure and file names.
   */
  public async scanWorkspace(
    onProgress: (message: string, percentage: number) => void,
  ): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return "No workspace open.";
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const totalFiles = await this._estimateTotalFiles();

    // Initialize the scan context to manage recursion state
    const context: ScanContext = {
      rootPath,
      totalFiles,
      processedCount: 0,
      onProgress,
    };

    const treeHeader = `Project Root: ${path.basename(rootPath)}\n`;
    const treeBody = await this._scanDirectory(rootPath, 0, context);

    return treeHeader + treeBody;
  }

  /**
   * Recursively walks through directories to build the file tree.
   * Responsible for filtering files, checking depth limits, and invoking progress updates.
   */
  private async _scanDirectory(
    currentPath: string,
    depth: number,
    context: ScanContext,
  ): Promise<string> {
    if (depth > ProjectScanner.MAX_DEPTH) return "";

    let treeOutput = "";

    try {
      const files = await fs.promises.readdir(currentPath);

      for (const fileName of files) {
        if (this._shouldIgnore(fileName)) continue;

        const filePath = path.join(currentPath, fileName);
        const stats = await fs.promises.stat(filePath);
        const indent = "  ".repeat(depth);

        if (stats.isDirectory()) {
          treeOutput += `${indent}📂 ${fileName}/\n`;
          treeOutput += await this._scanDirectory(filePath, depth + 1, context);
        } else if (this._isCodeFile(fileName)) {
          context.processedCount++;
          treeOutput += `${indent}📄 ${fileName}\n`;
          this._updateProgress(fileName, context);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }

    return treeOutput;
  }

  /**
   * Calculates a rough estimate of total files for the progress bar.
   * Uses VS Code's native findFiles which is faster than a manual pre-scan.
   */
  private async _estimateTotalFiles(): Promise<number> {
    const files = await vscode.workspace.findFiles(
      "**/*",
      "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**}",
    );
    return files.length;
  }

  /**
   * Determines if a file or directory should be skipped based on exclusion lists.
   */
  private _shouldIgnore(name: string): boolean {
    if (name.startsWith(".")) return true; // Ignore hidden files/dotfiles
    return (
      ProjectScanner.IGNORED_DIRECTORIES.has(name) ||
      ProjectScanner.IGNORED_FILES.has(name)
    );
  }

  /**
   * Checks if a file is a source code file relevant to the analysis.
   */
  private _isCodeFile(filename: string): boolean {
    const lowerName = filename.toLowerCase();
    if (lowerName === "dockerfile") return true;

    const ext = path.extname(lowerName);
    return ProjectScanner.VALID_EXTENSIONS.has(ext);
  }

  /**
   * Throttles progress updates to avoid freezing the UI.
   */
  private _updateProgress(currentFile: string, context: ScanContext) {
    const { processedCount, totalFiles, onProgress } = context;

    // Update every 2 files or when finished to reduce message overhead
    if (processedCount % 2 === 0 || processedCount === totalFiles) {
      const rawPercentage = (processedCount / totalFiles) * 100;
      const percentage = Math.min(100, Math.round(rawPercentage));
      onProgress(`Scanning: ${currentFile}`, percentage);
    }
  }
}
