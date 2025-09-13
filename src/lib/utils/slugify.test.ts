import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("should convert text to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("UPPERCASE")).toBe("uppercase");
  });

  it("should replace spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
    expect(slugify("multiple   spaces")).toBe("multiple-spaces");
  });

  it("should remove special characters", () => {
    expect(slugify("hello!@#$%^&*()")).toBe("hello");
    expect(slugify("test.with.dots")).toBe("testwithdots");
  });

  it("should handle multiple consecutive hyphens", () => {
    expect(slugify("hello---world")).toBe("hello-world");
    expect(slugify("test - - - slug")).toBe("test-slug");
  });

  it("should trim hyphens from beginning and end", () => {
    expect(slugify(" hello world ")).toBe("hello-world");
    expect(slugify("---test---")).toBe("test");
  });

  it("should preserve existing hyphens", () => {
    expect(slugify("already-hyphenated")).toBe("already-hyphenated");
    expect(slugify("mix-of spaces-and-hyphens")).toBe(
      "mix-of-spaces-and-hyphens",
    );
  });

  it("should handle empty strings", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});
