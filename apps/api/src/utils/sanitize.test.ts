import { describe, it, expect } from 'vitest'
import { sanitizeText } from './sanitize.js'

describe('sanitizeText', () => {
  it('should remove control characters', () => {
    const input = 'Hello\u0000World\u0008Test'
    const expected = 'Hello World Test'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should collapse multiple whitespace', () => {
    const input = 'Hello    World\t\tTest'
    const expected = 'Hello World Test'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should remove script tags', () => {
    const input = 'Hello<script>alert("xss")</script>World'
    const expected = 'HelloWorld'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should remove iframe tags', () => {
    const input = 'Hello<iframe src="evil.com"></iframe>World'
    const expected = 'HelloWorld'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should remove event handlers', () => {
    const input = 'Hello< onclick="alert(1)" >World'
    const expected = 'Hello< "alert(1)" >World'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should remove javascript: protocol', () => {
    const input = 'Hellojavascript:alert(1)World'
    const expected = 'Helloalert(1)World'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should trim whitespace', () => {
    const input = '  Hello World  '
    const expected = 'Hello World'
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('should handle string with only control characters', () => {
    const input = '\u0000\u0001\u0002'
    const expected = ''
    expect(sanitizeText(input)).toBe(expected)
  })

  it('should preserve normal characters', () => {
    const input = 'Hello World! 123 @#$%'
    const expected = 'Hello World! 123 @#$%'
    expect(sanitizeText(input)).toBe(expected)
  })
})
