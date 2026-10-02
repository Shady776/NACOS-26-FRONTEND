import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative"
    >
      <Sun
        className={`w-5 h-5 transition-all ${theme === "dark" ? "scale-0 -rotate-90 absolute" : "scale-100 rotate-0"}`}
      />
      <Moon
        className={`w-5 h-5 transition-all ${theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90 absolute"}`}
      />
    </Button>
  );
}