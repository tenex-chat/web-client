import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} placeholder="Search items..." />)
    
    const input = screen.getByPlaceholderText('Search items...')
    expect(input).toBeInTheDocument()
  })

  it('displays the current value', () => {
    const onChange = vi.fn()
    render(<SearchBar value="test query" onChange={onChange} />)
    
    const input = screen.getByDisplayValue('test query')
    expect(input).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'new search' } })
    
    expect(onChange).toHaveBeenCalledWith('new search')
  })

  it('shows clear button when value is present', () => {
    const onChange = vi.fn()
    render(<SearchBar value="some text" onChange={onChange} />)
    
    const clearButton = screen.getByRole('button')
    expect(clearButton).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    
    const clearButton = screen.queryByRole('button')
    expect(clearButton).not.toBeInTheDocument()
  })

  it('clears the search when clear button is clicked', () => {
    const onChange = vi.fn()
    render(<SearchBar value="some text" onChange={onChange} />)
    
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)
    
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('uses default placeholder when not provided', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Search...')
    expect(input).toBeInTheDocument()
  })
})