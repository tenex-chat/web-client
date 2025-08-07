import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "../alert";

describe("Alert", () => {
    it("renders with default variant", () => {
        render(<Alert>Default alert</Alert>);
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent("Default alert");
        expect(alert).toHaveClass("bg-background", "text-foreground");
    });

    it("renders with destructive variant", () => {
        render(<Alert variant="destructive">Destructive alert</Alert>);
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent("Destructive alert");
        expect(alert).toHaveClass("text-destructive");
    });

    it("applies custom className", () => {
        render(<Alert className="custom-class">Custom class alert</Alert>);
        const alert = screen.getByRole("alert");
        expect(alert).toHaveClass("custom-class");
    });

    it("forwards ref correctly", () => {
        const ref = { current: null };
        render(<Alert ref={ref}>Alert with ref</Alert>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
});

describe("AlertTitle", () => {
    it("renders title correctly", () => {
        render(<AlertTitle>Alert Title</AlertTitle>);
        const title = screen.getByText("Alert Title");
        expect(title).toBeInTheDocument();
        expect(title.tagName).toBe("H5");
        expect(title).toHaveClass("font-medium", "leading-none", "tracking-tight");
    });

    it("applies custom className to title", () => {
        render(<AlertTitle className="custom-title">Title</AlertTitle>);
        const title = screen.getByText("Title");
        expect(title).toHaveClass("custom-title");
    });
});

describe("AlertDescription", () => {
    it("renders description correctly", () => {
        render(<AlertDescription>Alert Description</AlertDescription>);
        const description = screen.getByText("Alert Description");
        expect(description).toBeInTheDocument();
        expect(description).toHaveClass("text-sm");
    });

    it("applies custom className to description", () => {
        render(<AlertDescription className="custom-desc">Description</AlertDescription>);
        const description = screen.getByText("Description");
        expect(description).toHaveClass("custom-desc");
    });
});