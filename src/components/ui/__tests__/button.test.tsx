import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";

describe("Button", () => {
    it("renders children correctly", () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("handles click events", async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();
        
        render(<Button onClick={handleClick}>Click me</Button>);
        await user.click(screen.getByRole("button"));
        
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies disabled state correctly", () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole("button");
        
        expect(button).toBeDisabled();
    });

    it("applies different variants correctly", () => {
        const { rerender } = render(<Button variant="default">Default</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-primary");
        
        rerender(<Button variant="destructive">Destructive</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-destructive");
        
        rerender(<Button variant="outline">Outline</Button>);
        expect(screen.getByRole("button")).toHaveClass("border");
        
        rerender(<Button variant="ghost">Ghost</Button>);
        expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");
    });

    it("applies different sizes correctly", () => {
        const { rerender } = render(<Button size="default">Default</Button>);
        expect(screen.getByRole("button")).toHaveClass("h-9");
        
        rerender(<Button size="sm">Small</Button>);
        expect(screen.getByRole("button")).toHaveClass("h-8");
        
        rerender(<Button size="lg">Large</Button>);
        expect(screen.getByRole("button")).toHaveClass("h-11");
        
        rerender(<Button size="icon">Icon</Button>);
        expect(screen.getByRole("button")).toHaveClass("size-9");
    });

    it("renders as a child when asChild is true", () => {
        render(
            <Button asChild>
                <a href="/test">Link as button</a>
            </Button>
        );
        
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/test");
        expect(link).toHaveTextContent("Link as button");
    });
});