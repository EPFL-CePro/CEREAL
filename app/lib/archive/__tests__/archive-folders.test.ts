import { describe, expect, it } from 'vitest'
import { courseArchivePath, isSafePathSegment } from '@/app/lib/archive/archive-folders'

describe('courseArchivePath', () => {
    it('builds the archive path of a course', () => {
        expect(courseArchivePath('2025-2026', 'CS-433')).toBe('CS/2025-2026/CS-4XX/CS-433')
    })

    it('uses the first character after the dash for the group', () => {
        expect(courseArchivePath('2025-2026', 'CMS-ADM1')).toBe('CMS/2025-2026/CMS-AXX/CMS-ADM1')
    })

    it('returns null if the course code has no dash', () => {
        expect(courseArchivePath('2025-2026', 'CS433')).toBeNull()
    })

    it('returns null if nothing follows the dash', () => {
        expect(courseArchivePath('2025-2026', 'CS-')).toBeNull()
    })
})

describe('isSafePathSegment', () => {
    it('accepts a simple folder name', () => {
        expect(isSafePathSegment('CS-433')).toBe(true)
        expect(isSafePathSegment('2025-2026')).toBe(true)
    })

    it('rejects an empty segment', () => {
        expect(isSafePathSegment('')).toBe(false)
    })

    it('rejects names starting with a dot (".", "..", hidden files)', () => {
        expect(isSafePathSegment('.')).toBe(false)
        expect(isSafePathSegment('..')).toBe(false)
        expect(isSafePathSegment('.env')).toBe(false)
    })

    it('rejects path separators and null bytes', () => {
        expect(isSafePathSegment('a/b')).toBe(false)
        expect(isSafePathSegment('a\\b')).toBe(false)
        expect(isSafePathSegment('a\0b')).toBe(false)
    })
})
