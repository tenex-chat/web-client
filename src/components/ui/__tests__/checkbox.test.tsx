import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "../checkbox";

describe("Checkbox", () => {
    it("renders unchecked by default", () => {
        const { container } = render(<Checkbox />);
        const checkbox = container.querySelector('button[role="checkbox"]');
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute("aria-checked", "false");
        expect(checkbox).toHaveAttribute("data-state", "unchecked");
    });

    it("renders as checked when checked prop is true", () => {
        const { container } = render(<Checkbox checked={true} />);
        const checkbox = container.querySelector('button[role="checkbox"]');
        expect(checkbox).toHaveAttribute("aria-checked", "true");
        expect(checkbox).toHaveAttribute("data-state", "checked");
    });

    it("toggles checked state on click", () => {
        const onCheckedChange = vi.fn();
        const { container } = render(<Checkbox onCheckedChange={onCheckedChange} />);
        const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
        
        fireEvent.click(checkbox);
        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("applies custom className", () => {
        const { container } = render(<Checkbox className="custom-checkbox" />);
        const checkbox = container.querySelector('button[role="checkbox"]');
        expect(checkbox).toHaveClass("custom-checkbox");
    });

    it("can be disabled", () => {
        const onCheckedChange = vi.fn();
        const { container } = render(
            <Checkbox disabled onCheckedChange={onCheckedChange} />
        );
        const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
        
        expect(checkbox).toHaveAttribute("disabled");
        expect(checkbox).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
        
        fireEvent.click(checkbox);
        expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it("shows check icon when checked", () => {
        const { container, rerender } = render(<Checkbox checked={false} />);
        
        // No check icon when unchecked
        let checkIcon = container.querySelector('svg');
        expect(checkIcon).not.toBeInTheDocument();
        
        // Check icon appears when checked
        rerender(<Checkbox checked={true} />);
        checkIcon = container.querySelector('svg');
        expect(checkIcon).toBeInTheDocument();
        expect(checkIcon).toHaveClass("h-4", "w-4");
    });

    it("forwards ref correctly", () => {
        const ref = { current: null };
        render(<Checkbox ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("supports indeterminate state", () => {
        const { container } = render(<Checkbox checked="indeterminate" />);
        const checkbox = container.querySelector('button[role="checkbox"]');
        expect(checkbox).toHaveAttribute("aria-checked", "mixed");
        expect(checkbox).toHaveAttribute("data-state", "indeterminate");
    });
});