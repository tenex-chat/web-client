import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SelectableCardProps<T> {
    item: T;
    isSelected: boolean;
    onSelect: (item: T) => void;
    onDeselect: (item: T) => void;
    renderIcon?: (item: T) => ReactNode;
    renderTitle: (item: T) => ReactNode;
    renderDescription?: (item: T) => ReactNode;
    renderMeta?: (item: T) => ReactNode;
    renderTags?: (item: T) => string[];
}

export function SelectableCard<T>({
    item,
    isSelected,
    onSelect,
    onDeselect,
    renderIcon,
    renderTitle,
    renderDescription,
    renderMeta,
    renderTags,
}: SelectableCardProps<T>) {
    const handleClick = () => {
        if (isSelected) {
            onDeselect(item);
        } else {
            onSelect(item);
        }
    };

    const tags = renderTags?.(item) || [];

    return (
        <Card
            className={cn(
                "p-4 cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary"
            )}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                {/* Selection indicator */}
                <div className="mt-1">
                    <div
                        className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                                ? "bg-primary border-primary"
                                : "border-gray-300 dark:border-gray-600"
                        )}
                    >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                </div>

                {/* Icon */}
                {renderIcon && <div className="mt-1">{renderIcon(item)}</div>}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {renderTitle(item)}
                    </h4>

                    {/* Description */}
                    {renderDescription && (
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {renderDescription(item)}
                        </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Meta information */}
                    {renderMeta && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {renderMeta(item)}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}