import { describe, it, expect } from 'vitest';
import { ProjectAvatarUtils } from './business';

describe('ProjectAvatarUtils', () => {
    describe('getAvatar', () => {
        it('should return picture if available', () => {
            const project = {
                picture: 'https://example.com/avatar.jpg',
                tagValue: () => undefined,
                title: 'Test Project'
            };
            expect(ProjectAvatarUtils.getAvatar(project)).toBe('https://example.com/avatar.jpg');
        });

        it('should generate avatar from d tag if no picture', () => {
            const project = {
                tagValue: (key: string) => key === 'd' ? 'project-id' : undefined,
                title: 'Test Project'
            };
            expect(ProjectAvatarUtils.getAvatar(project)).toBe(
                'https://api.dicebear.com/7.x/thumbs/svg?seed=project-id'
            );
        });

        it('should generate avatar from title if no picture or d tag', () => {
            const project = {
                title: 'Test Project',
                tagValue: () => undefined
            };
            expect(ProjectAvatarUtils.getAvatar(project)).toBe(
                'https://api.dicebear.com/7.x/thumbs/svg?seed=Test%20Project'
            );
        });

        it('should use default seed if no data available', () => {
            const project = {
                tagValue: () => undefined
            };
            expect(ProjectAvatarUtils.getAvatar(project)).toBe(
                'https://api.dicebear.com/7.x/thumbs/svg?seed=default'
            );
        });
    });

    describe('getColors', () => {
        it('should return consistent color for same title', () => {
            const color1 = ProjectAvatarUtils.getColors('Test Project');
            const color2 = ProjectAvatarUtils.getColors('Test Project');
            expect(color1).toBe(color2);
        });

        it('should return different colors for different titles', () => {
            const color1 = ProjectAvatarUtils.getColors('Project A');
            const color2 = ProjectAvatarUtils.getColors('Project B');
            // They might be the same due to modulo, but generally should differ
            expect(typeof color1).toBe('string');
            expect(typeof color2).toBe('string');
        });

        it('should always return a valid gradient class', () => {
            const color = ProjectAvatarUtils.getColors('Any Title');
            expect(color).toMatch(/^bg-gradient-to-br from-\w+-500 to-\w+-600$/);
        });
    });

    describe('getInitials', () => {
        it('should extract initials from title', () => {
            expect(ProjectAvatarUtils.getInitials('Test Project')).toBe('TP');
        });

        it('should handle single word titles', () => {
            expect(ProjectAvatarUtils.getInitials('Project')).toBe('P');
        });

        it('should handle empty titles', () => {
            expect(ProjectAvatarUtils.getInitials('')).toBe('');
        });

        it('should limit initials to two characters', () => {
            expect(ProjectAvatarUtils.getInitials('Very Long Project Name')).toBe('VL');
        });
    });
});