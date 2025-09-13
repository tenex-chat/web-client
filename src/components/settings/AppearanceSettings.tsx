import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Monitor } from "lucide-react";
import { useAtom } from "jotai";
import {
  fontSizeAtom,
  compactModeAtom,
  animationsEnabledAtom,
} from "@/stores/ui";
import { useEffect } from "react";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);
  const [compactMode, setCompactMode] = useAtom(compactModeAtom);
  const [animations, setAnimations] = useAtom(animationsEnabledAtom);

  // Apply settings on load and changes
  useEffect(() => {
    // Apply font size to document
    document.documentElement.style.fontSize =
      {
        small: "14px",
        medium: "16px",
        large: "18px",
      }[fontSize] || "16px";

    // Apply compact mode class
    if (compactMode) {
      document.documentElement.classList.add("compact");
    } else {
      document.documentElement.classList.remove("compact");
    }

    // Apply animations preference
    if (!animations) {
      document.documentElement.classList.add("no-animations");
    } else {
      document.documentElement.classList.remove("no-animations");
    }
  }, [fontSize, compactMode, animations]);

  const handleFontSizeChange = (value: "small" | "medium" | "large") => {
    setFontSize(value);
  };

  const handleCompactModeChange = (checked: boolean) => {
    setCompactMode(checked);
  };

  const handleAnimationsChange = (checked: boolean) => {
    setAnimations(checked);
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Theme</h3>
        <RadioGroup
          value={theme}
          onValueChange={(value) =>
            setTheme(value as "light" | "dark" | "system")
          }
        >
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="light" id="light" />
            <Label
              htmlFor="light"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sun className="h-4 w-4" />
              Light
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="dark" id="dark" />
            <Label
              htmlFor="dark"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label
              htmlFor="system"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Monitor className="h-4 w-4" />
              System
            </Label>
          </div>
        </RadioGroup>
      </Card>

      {/* Display Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Display</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="font-size" className="mb-2 block">
              Font Size
            </Label>
            <Select value={fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing between elements
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={handleCompactModeChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animations">Animations</Label>
              <p className="text-sm text-muted-foreground">
                Enable interface animations
              </p>
            </div>
            <Switch
              id="animations"
              checked={animations}
              onCheckedChange={handleAnimationsChange}
            />
          </div>
        </div>
      </Card>

      {/* Color Scheme */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Color Scheme</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            "default",
            "blue",
            "green",
            "purple",
            "orange",
            "red",
            "zinc",
            "stone",
          ].map((color) => (
            <button
              key={color}
              className={`h-12 rounded-md border-2 ${
                color === "default"
                  ? "bg-gradient-to-r from-blue-500 to-purple-500"
                  : `bg-${color}-500`
              } hover:scale-105 transition-transform`}
              onClick={() => {
                document.documentElement.setAttribute(
                  "data-color-scheme",
                  color,
                );
                localStorage.setItem("color-scheme", color);
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
