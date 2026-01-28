import * as vscode from "vscode";
import { getUri } from "../../utilities/getUri";
import { getNonce } from "../../utilities/getNonce";

export class ViewGenerator {
  public static getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ): string {
    const stylesUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        "webview-ui",
        "build",
        "assets",
        "index.js",
      ),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          script-src 'nonce-${nonce}' https: 'unsafe-eval'; 
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource};
          connect-src ${webview.cspSource} https:;
        ">

        <link href="${stylesUri}" rel="stylesheet">
        <title>NorthStar AI</title>
      </head>
      <body>
        <div id="root"></div>
        
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
