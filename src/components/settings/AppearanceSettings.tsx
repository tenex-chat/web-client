import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('appearance-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setFontSize(settings.fontSize || 'medium');
        setCompactMode(settings.compactMode || false);
        setAnimations(settings.animations !== false);
      } catch (error) {
        console.error('Failed to load appearance settings:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const saveSettings = (updates: Partial<{ fontSize: string; compactMode: boolean; animations: boolean; }>) => {
    const current = {
      fontSize,
      compactMode,
      animations,
      ...updates,
    };
    localStorage.setItem('appearance-settings', JSON.stringify(current));
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    saveSettings({ fontSize: value });
    
    // Apply font size to document
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }[value] || '16px';
  };

  const handleCompactModeChange = (checked: boolean) => {
    setCompactMode(checked);
    saveSettings({ compactMode: checked });
    
    // Apply compact mode class
    if (checked) {
      document.documentElement.classList.add('compact');
    } else {
      document.documentElement.classList.remove('compact');
    }
  };

  const handleAnimationsChange = (checked: boolean) => {
    setAnimations(checked);
    saveSettings({ animations: checked });
    
    // Apply animations preference
    if (!checked) {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Theme</h3>
        <RadioGroup value={theme} onValueChange={setTheme}>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
              <Sun className="h-4 w-4" />
              Light
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
              <Moon className="h-4 w-4" />
              Dark
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
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
            <Label htmlFor="font-size" className="mb-2 block">Font Size</Label>
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
              <p className="text-sm text-muted-foreground">Reduce spacing between elements</p>
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
              <p className="text-sm text-muted-foreground">Enable interface animations</p>
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
          {['default', 'blue', 'green', 'purple', 'orange', 'red', 'zinc', 'stone'].map((color) => (
            <button
              key={color}
              className={`h-12 rounded-md border-2 ${
                color === 'default' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                  : `bg-${color}-500`
              } hover:scale-105 transition-transform`}
              onClick={() => {
                document.documentElement.setAttribute('data-color-scheme', color);
                localStorage.setItem('color-scheme', color);
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}