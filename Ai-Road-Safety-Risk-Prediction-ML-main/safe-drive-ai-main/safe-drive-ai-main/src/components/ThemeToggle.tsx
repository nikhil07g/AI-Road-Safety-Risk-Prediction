import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg",
        "bg-secondary hover:bg-accent transition-colors",
        className
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-foreground" />}
    </button>
  );
}
