import { ReactNode, useEffect } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize theme on mount
    const stored = localStorage.getItem("wrp_theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Set body background
    document.body.style.backgroundColor = isDark ? "#1a1a1f" : "#fafbfc";
    document.body.style.color = isDark ? "#e4e4e7" : "#18181c";
  }, []);

  return <>{children}</>;
}
