import { EVENT_KINDS } from "./constants";

export type EventKind = (typeof EVENT_KINDS)[keyof typeof EVENT_KINDS];
