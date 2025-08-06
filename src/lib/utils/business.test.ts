import { describe, expect, it } from "vitest";
import { StringUtils, ProfileUtils, StatusUtils, TaskUtils, ProjectAvatarUtils } from "./business";

describe("StringUtils", () => {
    describe("truncate", () => {
        it("should not truncate text shorter than maxLength", () => {
            expect(StringUtils.truncate("Hello", 10)).toBe("Hello");
        });

        it("should truncate text longer than maxLength", () => {
            expect(StringUtils.truncate("Hello World", 5)).toBe("He...");
        });

        it("should handle custom suffix", () => {
            expect(StringUtils.truncate("Hello World", 5, "…")).toBe("Hell…");
        });

        it("should handle edge case with very short maxLength", () => {
            expect(StringUtils.truncate("Hello", 2)).toBe("...");
        });
    });

    describe("getInitials", () => {
        it("should get initials from single word", () => {
            expect(StringUtils.getInitials("John")).toBe("J");
        });

        it("should get initials from two words", () => {
            expect(StringUtils.getInitials("John Doe")).toBe("JD");
        });

        it("should get initials from multiple words", () => {
            expect(StringUtils.getInitials("John Doe Smith")).toBe("JD");
        });

        it("should handle pubkey-style names with ellipsis", () => {
            expect(StringUtils.getInitials("ab12cd...")).toBe("AB");
        });

        it("should return empty string for empty input", () => {
            expect(StringUtils.getInitials("")).toBe("");
        });
    });

    describe("getFirstLine", () => {
        it("should get first line from single line text", () => {
            expect(StringUtils.getFirstLine("Hello World")).toBe("Hello World");
        });

        it("should get first line from multi-line text", () => {
            expect(StringUtils.getFirstLine("Hello\nWorld")).toBe("Hello");
        });

        it("should truncate first line if maxLength specified", () => {
            expect(StringUtils.getFirstLine("Hello World", 5)).toBe("He...");
        });

        it("should handle empty string", () => {
            expect(StringUtils.getFirstLine("")).toBe("");
        });
    });

    describe("capitalize", () => {
        it("should capitalize first letter", () => {
            expect(StringUtils.capitalize("hello")).toBe("Hello");
        });

        it("should handle already capitalized string", () => {
            expect(StringUtils.capitalize("Hello")).toBe("Hello");
        });

        it("should handle empty string", () => {
            expect(StringUtils.capitalize("")).toBe("");
        });

        it("should only capitalize first letter", () => {
            expect(StringUtils.capitalize("hello world")).toBe("Hello world");
        });
    });

    describe("slugify", () => {
        it("should convert to lowercase", () => {
            expect(StringUtils.slugify("Hello World")).toBe("hello-world");
        });

        it("should replace spaces with hyphens", () => {
            expect(StringUtils.slugify("hello world")).toBe("hello-world");
        });

        it("should remove special characters", () => {
            expect(StringUtils.slugify("hello@world#2024")).toBe("hello-world-2024");
        });

        it("should remove leading and trailing hyphens", () => {
            expect(StringUtils.slugify("!hello world!")).toBe("hello-world");
        });

        it("should handle multiple consecutive spaces", () => {
            expect(StringUtils.slugify("hello    world")).toBe("hello-world");
        });
    });
});

describe("ProfileUtils", () => {
    describe("getAvatarUrl", () => {
        it("should return image URL if available", () => {
            const profile = { image: "image.jpg", picture: "picture.jpg" };
            expect(ProfileUtils.getAvatarUrl(profile)).toBe("image.jpg");
        });

        it("should return picture URL if image not available", () => {
            const profile = { picture: "picture.jpg" };
            expect(ProfileUtils.getAvatarUrl(profile)).toBe("picture.jpg");
        });

        it("should return undefined for null profile", () => {
            expect(ProfileUtils.getAvatarUrl(null)).toBeUndefined();
        });

        it("should return undefined for empty profile", () => {
            expect(ProfileUtils.getAvatarUrl({})).toBeUndefined();
        });
    });

    describe("getDisplayName", () => {
        it("should return displayName if available", () => {
            const profile = { displayName: "John Doe", name: "john" };
            expect(ProfileUtils.getDisplayName(profile)).toBe("John Doe");
        });

        it("should return name if displayName not available", () => {
            const profile = { name: "john" };
            expect(ProfileUtils.getDisplayName(profile)).toBe("john");
        });

        it("should return truncated pubkey if profile empty", () => {
            expect(ProfileUtils.getDisplayName(null, "1234567890abcdef")).toBe("12345678...");
        });

        it("should return fallback if no profile or pubkey", () => {
            expect(ProfileUtils.getDisplayName(null)).toBe("Anonymous");
        });

        it("should use custom fallback", () => {
            expect(ProfileUtils.getDisplayName(null, undefined, "Unknown")).toBe("Unknown");
        });
    });

    describe("getInitials", () => {
        it("should get initials from profile displayName", () => {
            const profile = { displayName: "John Doe" };
            expect(ProfileUtils.getInitials(profile)).toBe("JD");
        });

        it("should get initials from profile name", () => {
            const profile = { name: "john" };
            expect(ProfileUtils.getInitials(profile)).toBe("J");
        });

        it("should get initials from pubkey", () => {
            expect(ProfileUtils.getInitials(null, "abcdef123456")).toBe("AB");
        });
    });
});

describe("StatusUtils", () => {
    describe("getStatusColor", () => {
        it("should return correct color for completed status", () => {
            expect(StatusUtils.getStatusColor("completed")).toContain("green");
        });

        it("should return correct color for error status", () => {
            expect(StatusUtils.getStatusColor("error")).toContain("red");
        });

        it("should return correct color for in_progress status", () => {
            expect(StatusUtils.getStatusColor("in_progress")).toContain("blue");
        });

        it("should return correct color for pending status", () => {
            expect(StatusUtils.getStatusColor("pending")).toContain("yellow");
        });

        it("should return default color for unknown status", () => {
            expect(StatusUtils.getStatusColor("unknown")).toContain("gray");
        });
    });

    describe("getStatusIcon", () => {
        it("should return CheckCircle2 for completed status", () => {
            const iconName = StatusUtils.getStatusIcon("completed");
            expect(iconName).toBe("CheckCircle2");
        });

        it("should return Circle for unknown status", () => {
            const iconName = StatusUtils.getStatusIcon("unknown");
            expect(iconName).toBe("Circle");
        });
    });
});

describe("TaskUtils", () => {
    describe("getTaskTitle", () => {
        it("should return task title from tags", () => {
            const task = {
                tags: [["title", "Test Task"]]
            };
            expect(TaskUtils.getTaskTitle(task as any)).toBe("Test Task");
        });

        it("should return truncated content if no title tag", () => {
            const task = {
                content: "This is a very long task content that should be truncated"
            };
            const title = TaskUtils.getTaskTitle(task as any);
            expect(title.length).toBeLessThanOrEqual(63); // 60 + "..."
        });

        it("should return Untitled Task if no title or content", () => {
            const task = {};
            expect(TaskUtils.getTaskTitle(task as any)).toBe("Untitled Task");
        });
    });
});

describe("ProjectAvatarUtils", () => {
    describe("getAvatar", () => {
        it("should return picture if available", () => {
            const project = { picture: "avatar.jpg" };
            expect(ProjectAvatarUtils.getAvatar(project)).toBe("avatar.jpg");
        });

        it("should generate avatar URL from d tag", () => {
            const project = {
                tagValue: (key: string) => key === "d" ? "project-id" : undefined,
            };
            const url = ProjectAvatarUtils.getAvatar(project);
            expect(url).toContain("dicebear.com");
            expect(url).toContain("project-id");
        });

        it("should use title as fallback", () => {
            const project = { title: "My Project" };
            const url = ProjectAvatarUtils.getAvatar(project);
            expect(url).toContain("My%20Project");
        });

        it("should use default if nothing available", () => {
            const project = {};
            const url = ProjectAvatarUtils.getAvatar(project);
            expect(url).toContain("default");
        });
    });

    describe("getColors", () => {
        it("should return consistent color for same title", () => {
            const color1 = ProjectAvatarUtils.getColors("Test");
            const color2 = ProjectAvatarUtils.getColors("Test");
            expect(color1).toBe(color2);
        });

        it("should return a gradient color class", () => {
            const color = ProjectAvatarUtils.getColors("Test");
            expect(color).toContain("bg-gradient-to-br");
            expect(color).toContain("from-");
            expect(color).toContain("to-");
        });
    });

    describe("getInitials", () => {
        it("should delegate to StringUtils.getInitials", () => {
            expect(ProjectAvatarUtils.getInitials("Test Project")).toBe("TP");
            expect(ProjectAvatarUtils.getInitials("Single")).toBe("S");
        });
    });
});