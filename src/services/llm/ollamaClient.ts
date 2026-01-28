import { WorkspaceConfiguration, workspace } from "vscode";

// ============================================================================
// Interfaces & Types
// ============================================================================

interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface GenerateRequest {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
}

interface GenerateResponseChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// ============================================================================
// Client Implementation
// ============================================================================

export class OllamaClient {
  // Configuration Getters
  private get _configuration(): WorkspaceConfiguration {
    return workspace.getConfiguration("northstar");
  }

  private get _apiBaseUrl(): string {
    const url =
      this._configuration.get<string>("ollamaUrl") || "http://127.0.0.1:11434";
    // Normalize localhost to IP to avoid some Node.js fetch issues
    return url.replace("localhost", "127.0.0.1");
  }

  private get _defaultModel(): string {
    return this._configuration.get<string>("defaultModel") || "llama3";
  }

  /**
   * Checks if the Ollama server is reachable.
   * Useful for validating connection status before attempting generation.
   */
  public async isReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${this._apiBaseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generates a response from the LLM without streaming.
   * Wrapper around generateStreaming for simple use cases.
   */
  public async generate(
    prompt: string,
    systemPrompt: string = "",
  ): Promise<string> {
    let fullText = "";
    await this.generateStreaming(prompt, systemPrompt, (chunk) => {
      fullText += chunk;
    });
    return fullText;
  }

  /**
   * Retrieves a list of models currently installed on the Ollama server.
   * Returns an empty array on failure to prevent UI crashes.
   */
  public async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this._apiBaseUrl}/api/tags`);

      if (!response.ok) {
        console.error(`Ollama API error: ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as OllamaTagsResponse;
      return data?.models?.map((m) => m.name) || [];
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      return [];
    }
  }

  /**
   * Generates a response with real-time streaming support.
   * Responsible for managing the fetch stream, decoding chunks, and handling abort signals.
   */
  public async generateStreaming(
    prompt: string,
    systemPrompt: string,
    onChunk: (token: string) => void,
    signal?: AbortSignal,
    overrideModel?: string,
  ): Promise<string> {
    const requestBody: GenerateRequest = {
      model: overrideModel || this._defaultModel,
      prompt: prompt,
      system: systemPrompt,
      stream: true,
    };

    let fullResponse = "";

    try {
      const response = await fetch(`${this._apiBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: signal,
      });

      if (!response.body)
        throw new Error("No response body received from Ollama.");

      // Process the stream
      fullResponse = await this._processStream(response.body, onChunk, signal);

      return fullResponse;
    } catch (error: any) {
      if (error.name === "AbortError" || signal?.aborted) {
        return fullResponse + " [Stopped]";
      }
      throw error;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Reads and decodes the fetch stream.
   * Responsible for splitting the stream into lines and parsing JSON.
   */
  private async _processStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = "";

    // Ensure we release the lock if aborted externally
    if (signal) {
      signal.addEventListener("abort", () => {
        reader.cancel().catch(() => {});
      });
    }

    try {
      while (true) {
        if (signal?.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Ollama sends multiple JSON objects, sometimes in one chunk, separated by newlines
        const lines = chunk.split("\n");

        for (const line of lines) {
          this._parseAndEmitLine(line, (text) => {
            accumulatedResponse += text;
            onChunk(text);
          });
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulatedResponse;
  }

  /**
   * Parses a single line of JSON from the stream.
   * Safe against empty lines or malformed JSON.
   */
  private _parseAndEmitLine(line: string, callback: (text: string) => void) {
    if (!line.trim()) return;

    try {
      const json = JSON.parse(line) as GenerateResponseChunk;

      if (json.response) {
        callback(json.response);
      }

      if (json.done) {
        return;
      }
    } catch (e) {
      console.error("Error parsing Ollama JSON chunk", e);
    }
  }
}
