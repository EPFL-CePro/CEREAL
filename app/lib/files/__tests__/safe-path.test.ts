import { describe, expect, it } from 'vitest'
import path from 'path'
import { safeJoinPath } from '@/app/lib/files/safe-path'

const base = path.resolve('/srv/uploads')

describe('safeJoinPath', () => {
    it('joins segments inside the base directory', () => {
        expect(safeJoinPath(base, 'exam', 'file.pdf')).toBe(path.join(base, 'exam', 'file.pdf'))
    })

    it('returns the base directory itself when there are no segments', () => {
        expect(safeJoinPath(base)).toBe(base)
    })

    it('accepts ".." as long as the result stays inside the base', () => {
        expect(safeJoinPath(base, 'a', '..', 'b')).toBe(path.join(base, 'b'))
    })

    it('rejects a path that escapes the base with ".."', () => {
        expect(() => safeJoinPath(base, '..', 'etc', 'passwd')).toThrow('Invalid path')
        expect(() => safeJoinPath(base, 'a', '..', '..')).toThrow('Invalid path')
    })

    it('rejects an absolute segment outside the base', () => {
        expect(() => safeJoinPath(base, '/etc/passwd')).toThrow('Invalid path')
    })

    it('rejects a sibling folder that only shares the same prefix', () => {
        expect(() => safeJoinPath(base, '..', 'uploads-evil', 'file')).toThrow('Invalid path')
    })
})
