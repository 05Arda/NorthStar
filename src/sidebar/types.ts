import * as vscode from "vscode";

export enum WebviewCommand {
  WebviewReady = "webviewReady",
  GetModels = "getModels",
  Chat = "chat",
  StopGeneration = "stopGeneration",
  Analyze = "analyze",
  ClearHistory = "clearHistory",
  OnInfo = "onInfo",
  OnError = "onError",
}

// Handler'ların webview'a mesaj göndermesi için bir arayüz
export interface IWebViewMessageSender {
  postMessage: (message: any) => void;
}
