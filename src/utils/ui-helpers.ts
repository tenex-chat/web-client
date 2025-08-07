/**
 * Common UI helper functions to reduce redundancy across components
 */

import { StringUtils } from "../lib/utils/business";
import { UI_CONSTANTS } from "../lib/ui-constants";

/**
 * Generate avatar URL for an entity
 */
export function getEntityAvatar(
    entityId: string,
    imageUrl?: string,
    avatarStyle: "thumbs" | "shapes" | "avataaars" = "thumbs"
): string {
    if (imageUrl) return imageUrl;
    return `${UI_CONSTANTS.APIS.DICEBEAR_BASE}/${avatarStyle}/svg?seed=${encodeURIComponent(entityId)}`;
}

/**
 * Get initials from a name string
 * @deprecated Use StringUtils.getInitials from lib/utils/business instead
 */
export function getInitials(name?: string, fallback: string = "UN"): string {
    if (!name) return fallback;
    return StringUtils.getInitials(name);
}

/**
 * Extract tags of a specific type from a tag array
 */
export function extractTags(tags: Array<[string, string]>, tagType: string = "t"): string[] {
    return tags
        .filter((tag) => tag[0] === tagType && tag[1])
        .map((tag) => tag[1]);
}

/**
 * Filter entities based on search term
 */
export function filterEntities<T extends { name?: string; description?: string }>(
    entities: T[],
    searchTerm: string,
    additionalFields?: (entity: T) => string[]
): T[] {
    if (!searchTerm) return entities;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return entities.filter((entity) => {
        const searchableText = [
            entity.name?.toLowerCase() || "",
            entity.description?.toLowerCase() || "",
            ...(additionalFields ? additionalFields(entity).map(f => f.toLowerCase()) : [])
        ];
        
        return searchableText.some(text => text.includes(lowerSearchTerm));
    });
}

/**
 * Create a tag search filter function
 */
export function createTagSearchFilter<T>(
    getItemTags: (item: T) => string[]
) {
    return (item: T, searchTerm: string): boolean => {
        const searchLower = searchTerm.toLowerCase();
        const itemTags = getItemTags(item);
        return itemTags.some(tag => tag.toLowerCase().includes(searchLower));
    };
}


/**
 * Format timestamp to relative time
 * @deprecated Use useTimeFormat hook instead for more robust formatting
 */
export function formatRelativeTime(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return new Date(timestamp * 1000).toLocaleDateString();
}