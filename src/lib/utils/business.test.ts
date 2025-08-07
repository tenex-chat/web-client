import { describe, expect, it } from "vitest";
import { 
    StringUtils, 
    ProfileUtils, 
    StatusUtils, 
    TaskUtils, 
    ProjectAvatarUtils,
    ArrayUtils,
    ValidationUtils,
    ValidationRules
} from "./business";

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
            expect(TaskUtils.getTaskTitle(task as unknown as NDKEvent)).toBe("Test Task");
        });

        it("should return truncated content if no title tag", () => {
            const task = {
                content: "This is a very long task content that should be truncated"
            };
            const title = TaskUtils.getTaskTitle(task as unknown as NDKEvent);
            expect(title.length).toBeLessThanOrEqual(63); // 60 + "..."
        });

        it("should return Untitled Task if no title or content", () => {
            const task = {};
            expect(TaskUtils.getTaskTitle(task as unknown as NDKEvent)).toBe("Untitled Task");
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

describe("ArrayUtils", () => {
    describe("addUnique", () => {
        it("should add item if not present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.addUnique(array, 4)).toEqual([1, 2, 3, 4]);
        });

        it("should not add item if already present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.addUnique(array, 2)).toEqual([1, 2, 3]);
        });

        it("should work with strings", () => {
            const array = ["a", "b"];
            expect(ArrayUtils.addUnique(array, "c")).toEqual(["a", "b", "c"]);
            expect(ArrayUtils.addUnique(array, "a")).toEqual(["a", "b"]);
        });

        it("should work with empty array", () => {
            expect(ArrayUtils.addUnique([], "item")).toEqual(["item"]);
        });
    });

    describe("remove", () => {
        it("should remove item if present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.remove(array, 2)).toEqual([1, 3]);
        });

        it("should return same array if item not present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.remove(array, 4)).toEqual([1, 2, 3]);
        });

        it("should remove all occurrences", () => {
            const array = [1, 2, 2, 3];
            expect(ArrayUtils.remove(array, 2)).toEqual([1, 3]);
        });

        it("should work with empty array", () => {
            expect(ArrayUtils.remove([], "item")).toEqual([]);
        });
    });

    describe("toggle", () => {
        it("should add item if not present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.toggle(array, 4)).toEqual([1, 2, 3, 4]);
        });

        it("should remove item if present", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.toggle(array, 2)).toEqual([1, 3]);
        });

        it("should work with strings", () => {
            const array = ["a", "b"];
            expect(ArrayUtils.toggle(array, "c")).toEqual(["a", "b", "c"]);
            expect(ArrayUtils.toggle(array, "a")).toEqual(["b"]);
        });

        it("should work with empty array", () => {
            expect(ArrayUtils.toggle([], "item")).toEqual(["item"]);
        });
    });

    describe("move", () => {
        it("should move item forward", () => {
            const array = [1, 2, 3, 4];
            expect(ArrayUtils.move(array, 0, 2)).toEqual([2, 3, 1, 4]);
        });

        it("should move item backward", () => {
            const array = [1, 2, 3, 4];
            expect(ArrayUtils.move(array, 3, 1)).toEqual([1, 4, 2, 3]);
        });

        it("should handle moving to same position", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.move(array, 1, 1)).toEqual([1, 2, 3]);
        });

        it("should handle moving to end", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.move(array, 0, 2)).toEqual([2, 3, 1]);
        });

        it("should handle invalid fromIndex gracefully", () => {
            const array = [1, 2, 3];
            expect(ArrayUtils.move(array, 5, 1)).toEqual([1, 2, 3]);
        });
    });
});

describe("ValidationUtils", () => {
    describe("isValidUrl", () => {
        it("should validate correct URLs", () => {
            expect(ValidationUtils.isValidUrl("https://example.com")).toBe(true);
            expect(ValidationUtils.isValidUrl("http://localhost:3000")).toBe(true);
            expect(ValidationUtils.isValidUrl("ftp://files.example.com")).toBe(true);
            expect(ValidationUtils.isValidUrl("https://sub.domain.com/path?query=value#hash")).toBe(true);
        });

        it("should reject invalid URLs", () => {
            expect(ValidationUtils.isValidUrl("not a url")).toBe(false);
            expect(ValidationUtils.isValidUrl("example.com")).toBe(false);
            expect(ValidationUtils.isValidUrl("//example.com")).toBe(false);
            expect(ValidationUtils.isValidUrl("")).toBe(false);
        });
    });

    describe("isNonEmptyString", () => {
        it("should return true for non-empty strings", () => {
            expect(ValidationUtils.isNonEmptyString("hello")).toBe(true);
            expect(ValidationUtils.isNonEmptyString("  hello  ")).toBe(true);
        });

        it("should return false for empty or whitespace-only strings", () => {
            expect(ValidationUtils.isNonEmptyString("")).toBe(false);
            expect(ValidationUtils.isNonEmptyString("   ")).toBe(false);
            expect(ValidationUtils.isNonEmptyString("\t\n")).toBe(false);
        });
    });

    describe("isValidEmail", () => {
        it("should validate correct email addresses", () => {
            expect(ValidationUtils.isValidEmail("user@example.com")).toBe(true);
            expect(ValidationUtils.isValidEmail("john.doe@company.co.uk")).toBe(true);
            expect(ValidationUtils.isValidEmail("test+tag@domain.org")).toBe(true);
        });

        it("should reject invalid email addresses", () => {
            expect(ValidationUtils.isValidEmail("notanemail")).toBe(false);
            expect(ValidationUtils.isValidEmail("@example.com")).toBe(false);
            expect(ValidationUtils.isValidEmail("user@")).toBe(false);
            expect(ValidationUtils.isValidEmail("user @example.com")).toBe(false);
            expect(ValidationUtils.isValidEmail("")).toBe(false);
        });
    });

    describe("validateField", () => {
        it("should return null when all rules pass", () => {
            const rules = [
                ValidationRules.required(),
                ValidationRules.minLength(3)
            ];
            expect(ValidationUtils.validateField("hello", rules)).toBe(null);
        });

        it("should return first error message when rule fails", () => {
            const rules = [
                ValidationRules.required(),
                ValidationRules.minLength(10)
            ];
            expect(ValidationUtils.validateField("hi", rules)).toBe("Must be at least 10 characters");
        });

        it("should stop at first failing rule", () => {
            const rules = [
                ValidationRules.required("Field required"),
                ValidationRules.email("Invalid email")
            ];
            expect(ValidationUtils.validateField("", rules)).toBe("Field required");
        });
    });
});

describe("ValidationRules", () => {
    describe("required", () => {
        it("should pass for non-empty values", () => {
            const rule = ValidationRules.required();
            expect(rule("value")).toBe(null);
            expect(rule(123)).toBe(null);
            expect(rule(true)).toBe(null);
            expect(rule(false)).toBe(null);
            expect(rule(0)).toBe(null);
        });

        it("should fail for empty values", () => {
            const rule = ValidationRules.required();
            expect(rule("")).toBe("This field is required");
            expect(rule(null)).toBe("This field is required");
            expect(rule(undefined)).toBe("This field is required");
        });

        it("should use custom message", () => {
            const rule = ValidationRules.required("Custom required message");
            expect(rule("")).toBe("Custom required message");
        });
    });

    describe("minLength", () => {
        it("should pass for strings meeting minimum length", () => {
            const rule = ValidationRules.minLength(3);
            expect(rule("hello")).toBe(null);
            expect(rule("abc")).toBe(null);
        });

        it("should fail for strings below minimum length", () => {
            const rule = ValidationRules.minLength(5);
            expect(rule("hi")).toBe("Must be at least 5 characters");
            expect(rule("")).toBe("Must be at least 5 characters");
        });

        it("should handle non-string values", () => {
            const rule = ValidationRules.minLength(3);
            expect(rule(123)).toBe(null); // "123" has length 3
            expect(rule(null)).toBe("Must be at least 3 characters"); // "" has length 0
        });

        it("should use custom message", () => {
            const rule = ValidationRules.minLength(5, "Too short!");
            expect(rule("hi")).toBe("Too short!");
        });
    });

    describe("maxLength", () => {
        it("should pass for strings within maximum length", () => {
            const rule = ValidationRules.maxLength(5);
            expect(rule("hello")).toBe(null);
            expect(rule("hi")).toBe(null);
        });

        it("should fail for strings exceeding maximum length", () => {
            const rule = ValidationRules.maxLength(3);
            expect(rule("hello")).toBe("Must be no more than 3 characters");
        });

        it("should handle non-string values", () => {
            const rule = ValidationRules.maxLength(5);
            expect(rule(12345)).toBe(null); // "12345" has length 5
            expect(rule(123456)).toBe("Must be no more than 5 characters");
        });

        it("should use custom message", () => {
            const rule = ValidationRules.maxLength(3, "Too long!");
            expect(rule("hello")).toBe("Too long!");
        });
    });

    describe("email", () => {
        it("should pass for valid emails", () => {
            const rule = ValidationRules.email();
            expect(rule("user@example.com")).toBe(null);
            expect(rule("")).toBe(null); // Empty is allowed (use required() separately)
        });

        it("should fail for invalid emails", () => {
            const rule = ValidationRules.email();
            expect(rule("notanemail")).toBe("Must be a valid email address");
            expect(rule("user@")).toBe("Must be a valid email address");
        });

        it("should use custom message", () => {
            const rule = ValidationRules.email("Invalid email format");
            expect(rule("notanemail")).toBe("Invalid email format");
        });
    });

    describe("url", () => {
        it("should pass for valid URLs", () => {
            const rule = ValidationRules.url();
            expect(rule("https://example.com")).toBe(null);
            expect(rule("")).toBe(null); // Empty is allowed (use required() separately)
        });

        it("should fail for invalid URLs", () => {
            const rule = ValidationRules.url();
            expect(rule("not a url")).toBe("Must be a valid URL");
            expect(rule("example.com")).toBe("Must be a valid URL");
        });

        it("should use custom message", () => {
            const rule = ValidationRules.url("Invalid URL format");
            expect(rule("not a url")).toBe("Invalid URL format");
        });
    });
});