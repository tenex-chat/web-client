import { describe, it, expect } from 'vitest'
import { extractTTSContent, getTTSPreview } from './extractTTSContent'

describe('extractTTSContent', () => {
  it('removes thinking blocks', () => {
    const content = 'Hello <thinking>internal thoughts</thinking> world'
    expect(extractTTSContent(content)).toBe('Hello world')
  })
  
  it('removes multiline thinking blocks', () => {
    const content = `Start
<thinking>
Line 1
Line 2
Line 3
</thinking>
End`
    expect(extractTTSContent(content)).toBe('Start End')
  })
  
  it('replaces code blocks with marker', () => {
    const content = 'Here is code: ```js\nconst x = 1;\n``` done'
    expect(extractTTSContent(content)).toBe('Here is code: [code block] done')
  })
  
  it('keeps short inline code', () => {
    const content = 'Use the `useState` hook'
    expect(extractTTSContent(content)).toBe('Use the useState hook')
  })
  
  it('replaces long inline code with marker', () => {
    const content = 'Use `const reallyLongVariableNameHere = someFunction()` here'
    expect(extractTTSContent(content)).toBe('Use [code] here')
  })
  
  it('removes markdown bold formatting', () => {
    const content = 'This is **bold** and __also bold__'
    expect(extractTTSContent(content)).toBe('This is bold and also bold')
  })
  
  it('removes markdown italic formatting', () => {
    const content = 'This is *italic* and _also italic_'
    expect(extractTTSContent(content)).toBe('This is italic and also italic')
  })
  
  it('removes markdown headers', () => {
    const content = `# Header 1
## Header 2
### Header 3
Regular text`
    expect(extractTTSContent(content)).toBe('Header 1 Header 2 Header 3 Regular text')
  })
  
  it('extracts text from markdown links', () => {
    const content = 'Check [this link](https://example.com) for info'
    expect(extractTTSContent(content)).toBe('Check this link for info')
  })
  
  it('replaces nostr links with marker', () => {
    const content = 'See nostr:npub1234567890abcdef for details'
    expect(extractTTSContent(content)).toBe('See [nostr link] for details')
  })
  
  it('handles complex mixed content', () => {
    const content = `
# Title
<thinking>Should I explain this?</thinking>
Here's **important** info with \`code\` and [a link](https://test.com).

\`\`\`python
def long_code():
    pass
\`\`\`

Check nostr:nevent1234 for more.
    `
    expect(extractTTSContent(content)).toBe(
      'Title Here\'s important info with code and a link. [code block] Check [nostr link] for more.'
    )
  })
  
  it('handles empty content', () => {
    expect(extractTTSContent('')).toBe('')
    expect(extractTTSContent(null as any)).toBe('')
    expect(extractTTSContent(undefined as any)).toBe('')
  })
  
  it('cleans up multiple spaces and newlines', () => {
    const content = 'Too    many     spaces\n\n\nand\n\n\nnewlines'
    expect(extractTTSContent(content)).toBe('Too many spaces and newlines')
  })
})

describe('getTTSPreview', () => {
  it('returns full content if under 100 chars', () => {
    const content = 'This is a short message'
    expect(getTTSPreview(content)).toBe('This is a short message')
  })
  
  it('truncates long content with ellipsis', () => {
    const content = 'a'.repeat(150)
    const preview = getTTSPreview(content)
    expect(preview).toHaveLength(103)
    expect(preview.endsWith('...')).toBe(true)
    expect(preview.substring(0, 100)).toBe('a'.repeat(100))
  })
  
  it('processes content before creating preview', () => {
    const content = '**Bold** text ' + 'x'.repeat(100)
    const preview = getTTSPreview(content)
    expect(preview.startsWith('Bold text')).toBe(true)
    expect(preview.endsWith('...')).toBe(true)
  })
})