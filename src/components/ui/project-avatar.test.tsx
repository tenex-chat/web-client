import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectAvatar } from "./project-avatar";
import { NDKProject } from "@/lib/ndk-events/NDKProject";

describe("ProjectAvatar", () => {
  const createMockProject = (overrides: any = {}) => {
    const project = new NDKProject(undefined);
    project.tags = overrides.tags || [["d", "test-dtag"]];

    // Set title using the setter which adds the proper tag
    if (overrides.title !== undefined) {
      project.title = overrides.title;
    } else {
      project.title = "Test Project";
    }

    // Set picture if provided
    if (overrides.picture) {
      project.picture = overrides.picture;
    }

    // Set id if provided
    if (overrides.id) {
      project.id = overrides.id;
    }

    return project;
  };

  it("renders with deterministic background color based on d-tag", () => {
    const project1 = createMockProject({ tags: [["d", "project-1"]] });
    const project2 = createMockProject({ tags: [["d", "project-1"]] }); // Same d-tag
    const project3 = createMockProject({ tags: [["d", "different-project"]] });

    const { rerender } = render(<ProjectAvatar project={project1} />);
    const avatar1 = screen.getByText("TP");
    const style1 = avatar1.style.backgroundColor;

    rerender(<ProjectAvatar project={project2} />);
    const avatar2 = screen.getByText("TP");
    const style2 = avatar2.style.backgroundColor;

    rerender(<ProjectAvatar project={project3} />);
    const avatar3 = screen.getByText("TP");
    const style3 = avatar3.style.backgroundColor;

    // Same d-tag should produce same color
    expect(style1).toBe(style2);
    // Different d-tag should produce different color
    expect(style1).not.toBe(style3);
  });

  it("generates correct initials from project title", () => {
    const testCases = [
      { title: "My Project", expected: "MP" },
      { title: "SingleWord", expected: "SI" },
      { title: "Three Word Project", expected: "TW" },
      { title: "A", expected: "A" },
    ];

    testCases.forEach(({ title, expected }) => {
      const project = createMockProject({ title });
      render(<ProjectAvatar project={project} />);
      const element = screen.getByText(expected);
      expect(element).toBeInTheDocument();
      // Clean up for next test
      element.parentElement?.parentElement?.remove();
    });

    // Test empty title separately
    const emptyProject = createMockProject({ title: "" });
    render(<ProjectAvatar project={emptyProject} />);
    expect(screen.getByText("??")).toBeInTheDocument();
  });

  it("renders with image when picture is provided", async () => {
    const project = createMockProject({
      picture: "https://example.com/image.png",
    });

    render(<ProjectAvatar project={project} />);

    // The avatar should still render initials as fallback
    expect(screen.getByText("TP")).toBeInTheDocument();
  });

  it("falls back to project id when no d-tag available", () => {
    const project = createMockProject({
      tags: [], // No d-tag
      id: "fallback-id",
    });

    render(<ProjectAvatar project={project} />);
    const avatar = screen.getByText("TP");

    // Should still have a background color generated from the ID
    expect(avatar.style.backgroundColor).toBeTruthy();
  });
});
