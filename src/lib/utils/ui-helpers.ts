/**
 * Common UI helper functions to reduce redundancy across components
 */

import { UI_CONSTANTS } from "../ui-constants";

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