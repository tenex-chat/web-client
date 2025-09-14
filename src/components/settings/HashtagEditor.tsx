import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface HashtagEditorProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  disabled?: boolean;
}

export function HashtagEditor({ hashtags, onChange, disabled }: HashtagEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleAddHashtag = () => {
    if (!inputValue.trim()) return;
    
    const newTag = inputValue.trim().replace(/^#/, "").toLowerCase();
    
    if (newTag && !hashtags.includes(newTag)) {
      onChange([...hashtags, newTag]);
    }
    
    setInputValue("");
    setIsEditing(false);
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    onChange(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddHashtag();
    } else if (e.key === "Escape") {
      setInputValue("");
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Hashtags</Label>
      
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="px-3 py-1 text-sm flex items-center gap-1"
          >
            #{tag}
            {!disabled && (
              <button
                onClick={() => handleRemoveHashtag(tag)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {!disabled && (
          <>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (inputValue.trim()) {
                      handleAddHashtag();
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  placeholder="Enter hashtag"
                  className="h-8 w-32"
                  autoFocus
                />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add tag
              </Button>
            )}
          </>
        )}
      </div>
      
      {hashtags.length === 0 && !isEditing && (
        <p className="text-sm text-muted-foreground">
          No hashtags added yet. Add hashtags to help others discover your project.
        </p>
      )}
    </div>
  );
}