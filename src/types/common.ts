import type { ReactNode } from "react";

/**
 * Base props shared by all components
 */
export interface ComponentBaseProps {
    className?: string;
    children?: ReactNode;
}

/**
 * Props for form components
 */
export interface FormComponentProps extends ComponentBaseProps {
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
}

/**
 * Props for components that handle events
 */
export interface EventHandlerProps {
    onClick?: () => void;
    onSubmit?: () => void;
    onCancel?: () => void;
    onChange?: (value: unknown) => void;
}

/**
 * Props for dialog components
 */
export interface DialogProps extends ComponentBaseProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
}

/**
 * Props for list item components
 */
export interface ListItemProps extends ComponentBaseProps {
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

/**
 * Props for components with loading states
 */
export interface LoadingStateProps {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyMessage?: string;
}