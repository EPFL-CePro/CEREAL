import { describe, expect, it } from 'vitest'
import { businessDaysBetween } from '@/app/lib/dates/businessDays'

describe('businessDaysBetween', () => {
    it('counts Monday to Friday as 4 business days', () => {
        expect(businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 16))).toBe(4)
    })

    it('does not count weekends', () => {
        // Friday -> next Monday: only the Friday counts
        expect(businessDaysBetween(new Date(2026, 9, 16), new Date(2026, 9, 19))).toBe(1)
    })

    it('counts a full week as 5 business days', () => {
        expect(businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 19))).toBe(5)
    })

    it('returns 0 for the same day', () => {
        expect(businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 12))).toBe(0)
    })

    it('gives the same result if the dates are swapped', () => {
        expect(businessDaysBetween(new Date(2026, 9, 19), new Date(2026, 9, 12))).toBe(5)
    })
})
