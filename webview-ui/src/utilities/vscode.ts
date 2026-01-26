/**
 * VS Code Webview API tanımları.
 * Ekstra paket yüklememek için buraya manuel ekliyoruz.
 */
interface WebviewApi<State> {
  postMessage(message: unknown): void;
  getState(): State | undefined;
  setState(newState: State): void;
}

// Global fonksiyonu TypeScript'e tanıtıyoruz
declare function acquireVsCodeApi(): WebviewApi<unknown>;

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // VS Code ortamında mıyız kontrol et
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log("VS Code API unavailable (Browser Mode):", message);
    }
  }

  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    }
    return undefined;
  }

  public setState(newState: unknown): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(newState);
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
