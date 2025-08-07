import { X } from "lucide-react";
import { useState, KeyboardEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface TagInputProps {
    label: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function TagInput({ 
    label, 
    tags, 
    onTagsChange, 
    placeholder = "Add a tag and press Enter",
    className = ""
}: TagInputProps) {
    const [tagInput, setTagInput] = useState("");

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onTagsChange([...tags, trimmedTag]);
            setTagInput("");
        }
    };

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={className}>
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={placeholder}
                    className="flex-1"
                />
                <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    variant="secondary"
                >
                    Add
                </Button>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm flex items-center gap-1"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-destructive transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}