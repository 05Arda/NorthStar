import { WorkspaceConfiguration, workspace } from "vscode";

// Define interfaces for Ollama API responses
interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export class OllamaClient {
  private get _configuration(): WorkspaceConfiguration {
    return workspace.getConfiguration("northstar");
  }

  private get _apiBaseUrl(): string {
    const url =
      this._configuration.get<string>("ollamaUrl") || "http://127.0.0.1:11434";
    return url.replace("localhost", "127.0.0.1");
  }

  private get _model(): string {
    return this._configuration.get<string>("defaultModel") || "llama3";
  }

  public async isReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${this._apiBaseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generates a response with Streaming support.
   */
  public async generateStreaming(
    prompt: string,
    systemPrompt: string,
    onChunk: (token: string) => void,
    signal?: AbortSignal,
    overrideModel?: string,
  ): Promise<string> {
    // FIX 1: 'body' is defined here, inside the function scope
    const body = {
      model: overrideModel || this._model,
      prompt: prompt,
      system: systemPrompt,
      stream: true,
    };

    let fullResponse = "";

    try {
      const response = await fetch(`${this._apiBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), // Now it can find 'body'
        signal: signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Fix: Cancel reader if signal is aborted externally
      if (signal) {
        signal.addEventListener("abort", () => {
          reader.cancel().catch(() => {});
        });
      }

      while (true) {
        if (signal?.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullResponse += json.response;
              onChunk(json.response);
            }
            if (json.done) break;
          } catch (e) {
            console.error("Error parsing JSON chunk", e);
          }
        }
      }

      return fullResponse;
    } catch (error: any) {
      if (error.name === "AbortError" || signal?.aborted) {
        return fullResponse + " [Stopped]";
      }
      throw error;
    }
  }

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

  public async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this._apiBaseUrl}/api/tags`);

      if (!response.ok) {
        console.error(`Ollama API error: ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as OllamaTagsResponse;

      if (!data || !data.models) {
        return [];
      }

      return data.models.map((m) => m.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      return [];
    }
  }
}
