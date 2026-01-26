import { Uri, Webview } from "vscode";

/**
 * A helper function which will get the webview URI of a given file or path.
 *
 * @remarks
 * This URI can be used within the webview's HTML as a link source (e.g. <link href="..." />).
 *
 * @param webview - A reference to the extension webview
 * @param extensionUri - The URI of the directory containing the extension
 * @param pathList - An array of strings representing the path to a file inside the extension directory
 * @returns A URI pointing to the file, which can be used inside the webview
 */
export function getUri(
  webview: Webview,
  extensionUri: Uri,
  pathList: string[],
) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}
