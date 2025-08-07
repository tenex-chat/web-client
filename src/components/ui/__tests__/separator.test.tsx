import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "../separator";

describe("Separator", () => {
    it("renders horizontal separator by default", () => {
        const { container } = render(<Separator />);
        const separator = container.firstChild as HTMLElement;
        expect(separator).toBeTruthy();
        expect(separator.getAttribute("data-orientation")).toBe("horizontal");
        expect(separator.className).toContain("h-[1px]");
        expect(separator.className).toContain("w-full");
    });

    it("renders vertical separator when specified", () => {
        const { container } = render(<Separator orientation="vertical" />);
        const separator = container.firstChild as HTMLElement;
        expect(separator).toBeTruthy();
        expect(separator.getAttribute("data-orientation")).toBe("vertical");
        expect(separator.className).toContain("h-full");
        expect(separator.className).toContain("w-[1px]");
    });

    it("applies custom className", () => {
        const { container } = render(<Separator className="custom-separator" />);
        const separator = container.firstChild as HTMLElement;
        expect(separator.className).toContain("custom-separator");
    });

    it("is decorative by default", () => {
        const { container } = render(<Separator />);
        const separator = container.firstChild as HTMLElement;
        expect(separator).toBeTruthy();
        // Decorative separators have role="none" 
        expect(separator.getAttribute("role")).toBe("none");
    });

    it("can be non-decorative", () => {
        const { container } = render(<Separator decorative={false} />);
        const separator = container.firstChild as HTMLElement;
        expect(separator).toBeTruthy();
        // Non-decorative separators have role="separator"
        expect(separator.getAttribute("role")).toBe("separator");
    });

    it("forwards ref correctly", () => {
        const ref = { current: null };
        render(<Separator ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLElement);
    });
});