import { atom } from "jotai";

// Set of message IDs that have their replies expanded
export const expandedRepliesAtom = atom<Set<string>>(new Set());

// Atom to check if a specific message has expanded replies
export const isRepliesExpandedAtom = atom(
  (get) => (messageId: string) => {
    const expanded = get(expandedRepliesAtom);
    return expanded.has(messageId);
  }
);

// Atom to toggle expanded state for a message
export const toggleRepliesAtom = atom(
  null,
  (get, set, messageId: string) => {
    const expanded = new Set(get(expandedRepliesAtom));
    if (expanded.has(messageId)) {
      expanded.delete(messageId);
    } else {
      expanded.add(messageId);
    }
    set(expandedRepliesAtom, expanded);
  }
);