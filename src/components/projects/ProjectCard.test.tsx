import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from './ProjectCard'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import NDK from '@nostr-dev-kit/ndk-hooks'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, onClick, className }: any) => {
    // Simple param replacement for the mock
    let href = to
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        href = href.replace(`$${key}`, value as string)
      })
    }
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    )
  },
  useLocation: () => ({
    pathname: '/projects',
  }),
}))

// Mock NDK
vi.mock('@nostr-dev-kit/ndk')

describe('ProjectCard Component', () => {
  let mockProject: NDKProject
  let mockOnClick: ReturnType<typeof vi.fn>
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockNdk = new NDK()
    mockProject = new NDKProject(mockNdk, {
      id: 'project-123',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 31933,
      tags: [
        ['title', 'Test Project'],
        ['picture', 'https://example.com/image.png'],
        ['t', 'test'],
        ['t', 'project'],
        ['agent', 'agent1', 'Agent One'],
        ['agent', 'agent2', 'Agent Two'],
      ],
      content: 'This is a test project description',
      sig: '',
    })
    
    mockOnClick = vi.fn()
  })

  it('renders project information correctly', () => {
    render(
      <ProjectCard project={mockProject} isActive={false} onClick={mockOnClick} />
    )
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('This is a test project description')).toBeInTheDocument()
    expect(screen.getByText('2 agents')).toBeInTheDocument()
  })

  it('shows default values when data is missing', () => {
    const emptyProject = new NDKProject(new NDK(), {
      id: 'project-empty',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 31933,
      tags: [],
      content: '',
      sig: '',
    })
    
    render(
      <ProjectCard project={emptyProject} isActive={false} onClick={mockOnClick} />
    )
    
    expect(screen.getByText('Untitled Project')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
    expect(screen.getByText('0 agents')).toBeInTheDocument()
  })

  it('displays project avatar when picture is available', () => {
    render(
      <ProjectCard project={mockProject} isActive={false} onClick={mockOnClick} />
    )
    
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('src', 'https://example.com/image.png')
  })

  it('displays fallback avatar when no picture', () => {
    const noPictureProject = new NDKProject(new NDK(), {
      id: 'project-123',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 31933,
      tags: [
        ['title', 'Test Project'],
        ['t', 'test'],
        ['agent', 'agent1', 'Agent One'],
      ],
      content: 'Description',
      sig: '',
    })
    
    render(
      <ProjectCard project={noPictureProject} isActive={false} onClick={mockOnClick} />
    )
    
    expect(screen.getByText('TP')).toBeInTheDocument() // First letters of "Test Project"
  })

  it('applies active styles when isActive is true', () => {
    const { container } = render(
      <ProjectCard project={mockProject} isActive={true} onClick={mockOnClick} />
    )
    
    const link = container.querySelector('a')
    expect(link).toHaveClass('bg-accent')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    
    render(
      <ProjectCard project={mockProject} isActive={false} onClick={mockOnClick} />
    )
    
    const link = screen.getByRole('link')
    await user.click(link)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('navigates to correct project route', () => {
    const { container } = render(
      <ProjectCard project={mockProject} isActive={false} onClick={mockOnClick} />
    )
    
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/projects/project-123')
  })

  it('displays hashtags as badges', () => {
    render(
      <ProjectCard project={mockProject} isActive={false} onClick={mockOnClick} />
    )
    
    expect(screen.getByText('#test')).toBeInTheDocument()
    expect(screen.getByText('#project')).toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const longDescProject = new NDKProject(new NDK(), {
      id: 'project-123',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 31933,
      tags: [
        ['title', 'Test Project'],
      ],
      content: 'A'.repeat(200),
      sig: '',
    })
    
    render(
      <ProjectCard project={longDescProject} isActive={false} onClick={mockOnClick} />
    )
    
    const description = screen.getByText(/A+/)
    expect(description).toHaveClass('truncate')
  })
})