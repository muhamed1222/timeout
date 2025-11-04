import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry, ErrorBoundary } from "./lib/sentry";

// Initialize Sentry for error tracking
initSentry();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    fallback={(errorData) => {
      const error = errorData.error instanceof Error ? errorData.error : new Error(String(errorData.error));
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1>Упс! Что-то пошло не так</h1>
          <p style={{ color: "#666", marginTop: "1rem" }}>{error.message}</p>
          <button
            onClick={errorData.resetError}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid #ccc",
            }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }}
    showDialog={false}
  >
    <App />
  </ErrorBoundary>,
);
