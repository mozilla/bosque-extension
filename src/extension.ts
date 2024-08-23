import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

function formatLogLine(line: string): string | null {
  const parts = line.split(" ");

  if (parts.length < 7) {
    return null; // Ignore lines that don't match the expected format
  }

  const oldCommitHash = parts[0];
  const newCommitHash = parts[1];
  const authorName = parts.slice(2, parts.length - 4).join(" ");
  const timestamp = parseInt(parts[parts.length - 3], 10);
  const timeZone = parts[parts.length - 2];
  const commitMessage = parts
    .slice(parts.length - 1)
    .join(" ")
    .split("\t")[1];

  const date = new Date(timestamp * 1000).toLocaleString(); // Convert timestamp to a readable format

  return `
			<div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
					
					<p><strong>Author:</strong> ${authorName}</p>
					<p><strong>Date:</strong> ${date} (${timeZone})</p>
					<p><strong>Commit Message:</strong> ${commitMessage}</p>
			</div>
	`;
}

function getWebviewContent(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  const formattedLines = lines
    .map((line) => formatLogLine(line))
    .filter((line) => line !== null)
    .join("");

  return `<!DOCTYPE html>
					<html lang="en">
					<head>
							<style>
									body { font-family: Arial, sans-serif; padding: 20px; }
									div { background: #f9f9f9; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
									p { margin: 5px 0;
									color: #000; }
									strong { color: #333; }
							</style>
					</head>
					<body>
							<h1>Git Main Branch Logs</h1>
							${formattedLines}
					</body>
					</html>`;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "bosque.helloWorld",
    async () => {
      // Get the active editor's file path
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const fileDir = path.dirname(filePath);

      // Find the .git directory
      const gitDirectory = findGitDirectory(fileDir);
      if (!gitDirectory) {
        vscode.window.showErrorMessage("No .git directory found");
        return;
      }

      // Path to the log file for the main branch
      const logFilePath = path.join(
        gitDirectory,
        "logs",
        "refs",
        "heads",
        "main"
      );

      // Read the log file
      fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
          vscode.window.showErrorMessage(
            `Error reading log file: ${err.message}`
          );
          return;
        }

        // Display the log content in a webview
        const panel = vscode.window.createWebviewPanel(
          "gitMainBranchLogs",
          "Git Main Branch Logs",
          vscode.ViewColumn.One,
          {}
        );

        panel.webview.html = getWebviewContent(data);
      });
    }
  );

  context.subscriptions.push(disposable);
}

function findGitDirectory(startPath: string): string | null {
  let currentPath = startPath;

  while (currentPath !== path.parse(currentPath).root) {
    const gitPath = path.join(currentPath, ".git");
    if (fs.existsSync(gitPath) && fs.lstatSync(gitPath).isDirectory()) {
      return gitPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

export function deactivate() {}
