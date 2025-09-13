import { atom } from "jotai";

// Stack of hovered message IDs - the last one is the most deeply nested currently hovered
export const hoveredMessageStackAtom = atom<string[]>([]);

// Derived atom to get the currently hovered message (top of stack)
export const hoveredMessageIdAtom = atom((get) => {
  const stack = get(hoveredMessageStackAtom);
  return stack.length > 0 ? stack[stack.length - 1] : null;
});
