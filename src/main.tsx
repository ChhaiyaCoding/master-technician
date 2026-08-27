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
        {/* GitHub Pages serves the app from /master-technician/, so the router
            has to strip that prefix before matching. import.meta.env.BASE_URL
            is whatever `base` was set to at build time, and "/" in dev, so this
            stays correct in both without a second source of truth. */}
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </DiagnosisProvider>
    </ThemeProvider>
  </StrictMode>,
);
