import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { ThemeProvider } from "@/context/ThemeContext";
import { DiagnosisProvider } from "@/context/DiagnosisContext";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <DiagnosisProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DiagnosisProvider>
    </ThemeProvider>
  </StrictMode>,
);
