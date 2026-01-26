# NorthStar AI 🌟

**NorthStar AI** is a privacy-focused, local-first AI assistant designed specifically for VS Code. Powered by **Ollama**, it brings the intelligence of Large Language Models (LLMs) like DeepSeek, Llama 3, and Qwen directly into your editor without sending a single line of code to the cloud.

Experience real-time streaming, project-wide analysis, and smart documentation generation with a modern, native-feeling UI.

![NorthStar Demo](https://picsum.photos/200/300)
_(Replace this link with a screenshot or GIF of your extension)_

## ✨ Key Features

- **🔒 Privacy-First:** Runs entirely on your local machine using Ollama. No API keys, no data leaks.
- **⚡ Streaming & Thinking:** Real-time streaming responses with a visual "Thinking" indicator, allowing you to see the model's reasoning process (especially useful for models like DeepSeek-R1).
- **💬 Modern Chat Interface:** A sleek, theme-aware UI featuring a floating input bar, typing indicators, and markdown rendering.
- **📂 Explain File:** Right-click any open file to get a comprehensive explanation of its logic, architecture, and purpose.
- **📝 Smart Documentation:** Select any block of code and generate professional JSDoc/Docstrings with a single click.
- **🔍 Project Analysis:** Scans your workspace file structure to provide context-aware answers about your project's high-level architecture.
- **🛑 Full Control:** Stop generation instantly (Esc) if the output isn't what you need.
- **📜 Persistent History:** Automatically saves your conversation history—even partial responses if generation is interrupted—so you never lose context.

## 🚀 Prerequisites

NorthStar AI requires **Ollama** to be installed and running on your machine.

1.  **Download Ollama:** Visit [ollama.com](https://ollama.com/) and install it.
2.  **Pull a Model:** Open your terminal and download a model:
    ```bash
    ollama pull llama3
    # or
    ollama pull deepseek-r1:latest
    ```
3.  **Start Ollama:** Ensure the Ollama server is running (Default: `http://127.0.0.1:11434`).

## 📦 Installation (From Source)

1.  Clone the repository:

    ```bash
    git clone [https://github.com/05Arda/NorthStar.git](https://github.com/05Arda/NorthStar.git)
    cd NorthStar
    ```

2.  Install dependencies for both the extension and the webview UI:

    ```bash
    npm install
    cd webview-ui
    npm install
    cd ..
    ```

3.  Open the project in VS Code:

    ```bash
    code .
    ```

4.  Press **F5** to launch the Extension Development Host.

## 🎮 Usage

### 1. The Sidebar Chat

Click the **NorthStar** icon in the Activity Bar. Select your preferred model from the dropdown (automatically synced with `ollama ls`) and start chatting.

### 2. Context Menu Commands

Right-click on any file tab or text selection to access quick actions:

- **NorthStar: Explain File:** Analyzes and explains the currently active file.
- **NorthStar: Generate Docs:** Generates documentation comments for the selected code block.

### 3. Keyboard Shortcuts

| Command               | Shortcut (Win/Linux) | Shortcut (Mac)    | Description                             |
| :-------------------- | :------------------- | :---------------- | :-------------------------------------- |
| **Stop Generation**   | `Esc`                | `Esc`             | Instantly aborts the current AI stream. |
| **Analyze Project**   | `Ctrl + Alt + A`     | `Cmd + Alt + A`   | Scans workspace structure for context.  |
| **Explain File**      | `Ctrl + Shift + E`   | `Cmd + Shift + E` | Explains the active file.               |
| **Explain Selection** | `Ctrl + Shift + Q`   | `Cmd + Shift + Q` | Explains the selected code block.       |

## ⚙️ Configuration

You can customize NorthStar AI via VS Code Settings (`Ctrl + ,`):

- `northstar.defaultModel`: The default model to load on startup (e.g., `llama3`).
- `northstar.ollamaUrl`: The URL of your Ollama server (Default: `http://127.0.0.1:11434`).

## 🛠️ Tech Stack

- **Frontend:** React, Vite, VS Code Webview UI Toolkit, CSS Modules.
- **Backend:** TypeScript, VS Code Extension API.
- **AI Engine:** Ollama API (Local Inference).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bugs and feature requests.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
