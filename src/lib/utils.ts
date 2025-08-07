import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and merges Tailwind CSS classes intelligently.
 * 
 * @param inputs - Class names, conditionals, or objects to combine
 * @returns A merged string of class names with Tailwind conflicts resolved
 * 
 * @example
 * cn("px-2 py-1", "px-3") // Returns: "py-1 px-3" (px-3 overrides px-2)
 * cn("text-red-500", isActive && "text-blue-500") // Conditional classes
 * cn({ "bg-gray-100": isDisabled }) // Object syntax
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
