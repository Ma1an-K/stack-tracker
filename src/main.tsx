import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLog";
import { initNativeShell } from "./lib/nativeShell";

installGlobalErrorHandlers();
void initNativeShell();

const container = document.getElementById("root")!;
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
