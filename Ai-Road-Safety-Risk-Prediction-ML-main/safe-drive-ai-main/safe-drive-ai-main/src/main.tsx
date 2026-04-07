import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("📋 main.tsx loading...");
console.log("Looking for root element...");

// Wait for DOM to be ready
const waitForRoot = () => {
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds with 100ms intervals

  const findRoot = () => {
    const rootElement = document.getElementById("root");
    attempts++;

    if (rootElement) {
      console.log("✅ Root element found!");
      console.log("🎬 Rendering React app...");
      
      try {
        const root = createRoot(rootElement);
        root.render(<App />);
        console.log("✅ App rendered successfully");
      } catch (error) {
        console.error("❌ Error rendering app:", error);
      }
    } else {
      if (attempts < maxAttempts) {
        console.log(`⏳ Waiting for root element (attempt ${attempts}/${maxAttempts})`);
        setTimeout(findRoot, 100);
      } else {
        console.error("❌ Root element not found after waiting!");
      }
    }
  };

  findRoot();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitForRoot);
} else {
  waitForRoot();
}

