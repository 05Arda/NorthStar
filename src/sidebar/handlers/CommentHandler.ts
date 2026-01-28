import * as vscode from "vscode";
import { OllamaClient } from "../../services/llm/ollamaClient";
import { COMMENT_PROMPT } from "../../services/llm/prompts/comment";
import { IWebViewMessageSender } from "../types";

export class CommentHandler {
  // Kullanıcı onayı bekleyen yorum işleminin durumunu tutar
  private _pendingInsertion?: {
    comment: string;
    editor: vscode.TextEditor;
    position: vscode.Position;
  };

  constructor(
    private readonly _ollama: OllamaClient,
    private readonly _sender: IWebViewMessageSender,
  ) {}

  /**
   * VS Code komutu tetiklendiğinde çağrılır.
   */
  public async generateComment(editor: vscode.TextEditor) {
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    const languageId = editor.document.languageId;
    const commentAbortController = new AbortController();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "NorthStar: Generating clean comment...",
        cancellable: true,
      },
      async (progress, token) => {
        token.onCancellationRequested(() => commentAbortController.abort());

        try {
          // 1. Akışı başlat
          const rawComment = await this._streamCommentGeneration(
            text,
            languageId,
            commentAbortController,
          );

          // 2. Çıktıyı temizle
          const cleanedComment = this._sanitizeGeneratedComment(
            rawComment,
            text,
          );

          // 3. Ekleme işlemini hafızaya al
          this._pendingInsertion = {
            comment: cleanedComment,
            editor,
            position: selection.start,
          };

          // 4. Webview'a öneriyi gönder
          this._sender.postMessage({
            command: "proposeComment",
            comment: cleanedComment,
          });

          // 5. Paneli odaklar
          vscode.commands.executeCommand("northstar.sidebarView.focus");
        } catch (e: any) {
          if (e.name !== "AbortError") {
            vscode.window.showErrorMessage("NorthStar Error: " + e.message);
          }
        }
      },
    );
  }

  /**
   * Yorum oluşturma akışını yönetir ve kod bloğu bittiğinde durur.
   */
  private async _streamCommentGeneration(
    promptText: string,
    languageId: string,
    controller: AbortController,
  ): Promise<string> {
    const prompt = COMMENT_PROMPT(promptText, languageId);
    let fullText = "";
    let backticks = 0;

    await this._ollama.generateStreaming(
      prompt,
      "",
      (chunk) => {
        fullText += chunk;
        // Model kod bloğunu kapattıysa (` ``` `) durdur.
        backticks += (chunk.match(/```/g) || []).length;
        if (backticks >= 2) {
          controller.abort();
        }
      },
      controller.signal,
    );

    return fullText;
  }

  /**
   * LLM çıktısını temizleyip saf yorum satırına dönüştürür.
   */
  private _sanitizeGeneratedComment(
    rawText: string,
    originalCode: string,
  ): string {
    // 1. Kod bloklarını ayıkla
    const codeBlockMatch = rawText.match(/```[a-z]*\s*([\s\S]*?)(?:```|$)/i);
    let cleaned = (codeBlockMatch ? codeBlockMatch[1] : rawText).trim();

    // 2. Markdown kalıntılarını temizle
    cleaned = cleaned.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");

    // 3. Model orijinal kodu tekrar ettiyse sil
    const normalizedOriginal = originalCode.trim();
    const codeIndex = cleaned.indexOf(normalizedOriginal);
    if (codeIndex !== -1) {
      cleaned = cleaned.substring(0, codeIndex).trim();
    }

    // 4. Sohbet öneklerini (Sure, Here is...) sil
    cleaned = cleaned
      .replace(/^(Certainly!|Here is|Sure,|I've added).*\n?/gi, "")
      .trim();

    return cleaned;
  }
}
