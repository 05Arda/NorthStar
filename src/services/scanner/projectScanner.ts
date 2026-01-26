import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class ProjectScanner {
  private ignorePatterns = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    ".vscode",
    ".idea",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "assets",
    "coverage",
    ".next",
    "__tests__",
    "test",
    "tests",
    ".prettierrc",
    ".eslintrc",
    ".gitignore",
  ];

  /**
   * Scans the workspace and triggers a callback for progress updates.
   * @param onProgress Callback function (currentFile, percentage)
   */
  public async scanWorkspace(
    onProgress: (message: string, percentage: number) => void,
  ): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return "No workspace open.";

    const rootPath = workspaceFolders[0].uri.fsPath;

    // 1. First, get total file count (Fast) to calculate percentage
    // We exclude node_modules and .git for speed
    const allFiles = await vscode.workspace.findFiles(
      "**/*",
      "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**}",
    );
    const totalFiles = allFiles.length;
    let processedCount = 0;

    let fileTree = `Project Root: ${path.basename(rootPath)}\n`;

    // 2. Helper function to walk recursively
    const walk = async (dir: string, depth: number): Promise<string> => {
      let tree = "";
      if (depth > 5) return ""; // Depth limit

      try {
        const files = await fs.promises.readdir(dir);

        for (const file of files) {
          if (this.ignorePatterns.includes(file) || file.startsWith("."))
            continue;

          const filePath = path.join(dir, file);
          const stats = await fs.promises.stat(filePath);
          const indent = "  ".repeat(depth);

          if (stats.isDirectory()) {
            tree += `${indent}📂 ${file}/\n`;
            tree += await walk(filePath, depth + 1);
          } else {
            // It is a file
            if (this.isCodeFile(file)) {
              processedCount++;
              tree += `${indent}📄 ${file}\n`;

              // UPDATE PROGRESS
              // We throttle updates slightly to prevent UI freezing on massive repos
              if (processedCount % 2 === 0 || processedCount === totalFiles) {
                const percentage = Math.min(
                  100,
                  Math.round((processedCount / totalFiles) * 100),
                );
                onProgress(`Scanning: ${file}`, percentage);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error reading ${dir}:`, error);
      }
      return tree;
    };

    // 3. Start Scanning
    fileTree += await walk(rootPath, 0);
    return fileTree;
  }

  private isCodeFile(filename: string): boolean {
    // 2. GEREKSİZ UZANTILARI ELEYELİM
    const ext = path.extname(filename).toLowerCase();

    // Sadece mimariyi anlamaya yarayan ana dosyalar
    const validExtensions = [
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
      "dockerfile",
    ];

    return (
      validExtensions.includes(ext) || filename.toLowerCase() === "dockerfile"
    );
  }
}
