import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const [isRendering, setIsRendering] = useState(true);
  const lastRenderedChartRef = useRef<string>("");
  const renderTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Önceki timeout'u temizle
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    // Chart'ı temizle
    const cleanedChart = chart
      .replace(/^```mermaid\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Eğer bu chart zaten render edildiyse, tekrar render etme
    if (lastRenderedChartRef.current === cleanedChart && !isRendering) {
      return;
    }

    // Markdown code block'un tamamlanıp tamamlanmadığını kontrol et
    const hasOpeningTag = /```mermaid/i.test(chart);
    const hasClosingTag = /```\s*$/.test(chart);

    // Eğer kod bloğu başladı ama henüz tamamlanmadıysa, bekle
    if (hasOpeningTag && !hasClosingTag) {
      return;
    }

    // Debounce - son chunk'ın gelmesini bekle
    renderTimeoutRef.current = window.setTimeout(() => {
      renderDiagram(cleanedChart);
    }, 150);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [chart]);

  const renderDiagram = async (cleanedCode: string) => {
    if (!cleanedCode || !containerRef.current) return;

    // Eğer bu kod zaten render edildiyse, tekrar render etme
    if (lastRenderedChartRef.current === cleanedCode) {
      setIsRendering(false);
      return;
    }

    setIsRendering(true);

    try {
      // Mermaid'i yapılandır
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
        fontFamily: "var(--vscode-font-family, sans-serif)",
      });

      // Benzersiz ID
      idRef.current += 1;
      const id = `mermaid-${Date.now()}-${idRef.current}`;

      // Container'ı temizle ve bir pre elementi ekle
      containerRef.current.innerHTML = "";
      const preElement = document.createElement("pre");
      preElement.className = "mermaid";
      preElement.textContent = cleanedCode;
      preElement.id = id;
      containerRef.current.appendChild(preElement);

      // Mermaid'i çalıştır
      await mermaid.run({
        nodes: [preElement],
      });

      // Bu chart'ı render edildi olarak işaretle
      lastRenderedChartRef.current = cleanedCode;
      setIsRendering(false);
    } catch (error) {
      console.error("Mermaid render error:", error);
      setIsRendering(false);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="
            color: var(--vscode-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            text-align: left;
            background: rgba(255,0,0,0.1);
          ">
            <strong>⚠️ Diagram Error:</strong><br/>
            <code>${error instanceof Error ? error.message : "Unknown error"}</code>
          </div>
        `;
      }
    }
  };

  return (
    <div
      className="mermaid-container"
      style={{
        margin: "10px 0",
        padding: "10px",
        backgroundColor: "var(--vscode-editor-background)",
        overflowX: "auto",
        borderRadius: "4px",
        position: "relative",
      }}
    >
      {isRendering && (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            fontSize: "12px",
            opacity: 0.6,
            padding: "40px 0",
            textAlign: "center",
          }}
        >
          Rendering diagram...
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          minHeight: isRendering ? "0" : "auto",
          opacity: isRendering ? 0 : 1,
          transition: "opacity 0.2s ease-in-out",
        }}
      />
    </div>
  );
};

export default React.memo(Mermaid);
