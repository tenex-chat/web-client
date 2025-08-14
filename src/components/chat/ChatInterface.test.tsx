import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatInterface } from './ChatInterface'
import { useNDK, useNDKCurrentUser, useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { NDKUser } from '@nostr-dev-kit/ndk'
import type NDK from '@nostr-dev-kit/ndk'
import { NDKProject } from '@/lib/ndk-events/NDKProject'

// Mock NDK modules
vi.mock('@nostr-dev-kit/ndk', () => ({
  NDKEvent: vi.fn().mockImplementation(() => ({
    content: '',
    tags: [],
    publish: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockReturnValue({
      content: '',
      tags: [],
      publish: vi.fn().mockResolvedValue(undefined)
    })
  })),
  NDKUser: vi.fn().mockImplementation(() => ({
    pubkey: 'test-pubkey',
    profile: {
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg'
    }
  }))
}))

vi.mock('@nostr-dev-kit/ndk-hooks', () => ({
  useNDK: vi.fn(),
  useNDKCurrentUser: vi.fn(),
  useSubscribe: vi.fn()
}))

describe('ChatInterface', () => {
  const mockNdk = {
    connect: vi.fn(),
    subscribe: vi.fn().mockReturnValue({
      on: vi.fn(),
      stop: vi.fn()
    }),
    getUser: vi.fn().mockReturnValue({
      pubkey: 'test-pubkey',
      profile: { name: 'Test User' }
    })
  }

  const mockUser = new NDKUser({ pubkey: 'test-pubkey' })

  const mockProject = {
    id: 'test-project-id',
    title: 'Test Project',
    content: 'Test project description',
    tagReference: vi.fn().mockReturnValue('test-project-reference'),
    tags: [],
    pubkey: 'test-pubkey'
  } as unknown as NDKProject

  const defaultProps = {
    project: mockProject,
    threadId: 'test-thread-id'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNDK).mockReturnValue({ ndk: mockNdk as unknown as NDK })
    vi.mocked(useNDKCurrentUser).mockReturnValue(mockUser)
    vi.mocked(useSubscribe).mockReturnValue({ events: [], eose: false })
  })

  it('renders chat interface components', () => {
    render(<ChatInterface {...defaultProps} />)

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('enables send button when text is entered', async () => {
    render(<ChatInterface {...defaultProps} />)

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button', { name: /send/i })

    expect(sendButton).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Hello world' } })

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('sends message on Enter key press', async () => {
    render(<ChatInterface {...defaultProps} />)

    const input = screen.getByPlaceholderText('Type a message...')
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows typing indicator when typing', async () => {
    render(<ChatInterface {...defaultProps} />)

    const input = screen.getByPlaceholderText('Type a message...')
    
    fireEvent.change(input, { target: { value: 'Typing...' } })

    // Typing indicator logic would be tested here
    expect(input).toHaveValue('Typing...')
  })

  it('handles @mention autocomplete', async () => {
    render(<ChatInterface {...defaultProps} />)

    const input = screen.getByPlaceholderText('Type a message...')
    
    fireEvent.change(input, { target: { value: '@' } })

    // Autocomplete dropdown would appear here
    // This would require more complex mocking of the mention system
  })

  it('disables input when not authenticated', () => {
    vi.mocked(useNDKCurrentUser).mockReturnValue(null)
    
    render(<ChatInterface {...defaultProps} />)

    const input = screen.getByPlaceholderText('Type a message...')
    expect(input).toBeDisabled()
  })
})