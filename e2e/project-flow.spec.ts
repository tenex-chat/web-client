import { test, expect } from '@playwright/test'

test.describe('Project Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001')
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="projects-list"]', { timeout: 10000 })
  })

  test('should display project list when authenticated', async ({ page }) => {
    // Check that we're on the projects page
    await expect(page).toHaveURL(/\/projects/)
    
    // Check for project cards
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()
    expect(count).toBeGreaterThan(0)
    
    // Check first project has required elements
    const firstProject = projectCards.first()
    await expect(firstProject.locator('[data-testid="project-title"]')).toBeVisible()
    await expect(firstProject.locator('[data-testid="project-description"]')).toBeVisible()
  })

  test('should navigate to project detail page', async ({ page }) => {
    // Click on the first project
    const firstProject = page.locator('[data-testid="project-card"]').first()
    await firstProject.click()
    
    // Wait for navigation
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Check project detail elements
    await expect(page.locator('[data-testid="project-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-tabs"]')).toBeVisible()
    
    // Check tabs exist
    await expect(page.getByRole('tab', { name: 'Conversations' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Documentation' })).toBeVisible()
  })

  test('should switch between project tabs', async ({ page }) => {
    // Navigate to a project
    await page.locator('[data-testid="project-card"]').first().click()
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Test Conversations tab (default)
    await expect(page.locator('[data-testid="conversations-content"]')).toBeVisible()
    
    // Switch to Tasks tab
    await page.getByRole('tab', { name: 'Tasks' }).click()
    await expect(page.locator('[data-testid="tasks-content"]')).toBeVisible()
    
    // Switch to Documentation tab
    await page.getByRole('tab', { name: 'Documentation' }).click()
    await expect(page.locator('[data-testid="documentation-content"]')).toBeVisible()
    
    // Switch back to Conversations
    await page.getByRole('tab', { name: 'Conversations' }).click()
    await expect(page.locator('[data-testid="conversations-content"]')).toBeVisible()
  })

  test('should create a new conversation thread', async ({ page }) => {
    // Navigate to a project
    await page.locator('[data-testid="project-card"]').first().click()
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Check for new conversation input
    const newConversationInput = page.locator('[data-testid="new-conversation-input"]')
    await expect(newConversationInput).toBeVisible()
    
    // Type a message to start a new thread
    await newConversationInput.fill('Starting a new conversation thread')
    await newConversationInput.press('Enter')
    
    // Wait for the thread to be created
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 5000 })
    
    // Verify chat interface is now visible
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
  })

  test('should send a message in chat', async ({ page }) => {
    // Navigate to a project with an existing thread
    await page.locator('[data-testid="project-card"]').first().click()
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Start a new conversation if needed
    const newConversationInput = page.locator('[data-testid="new-conversation-input"]')
    if (await newConversationInput.isVisible()) {
      await newConversationInput.fill('Test thread')
      await newConversationInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-interface"]')
    }
    
    // Send a message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Hello, this is a test message!')
    await messageInput.press('Enter')
    
    // Verify message appears in the chat
    await expect(page.locator('text=Hello, this is a test message!')).toBeVisible({ timeout: 5000 })
  })

  test('should create a new task', async ({ page }) => {
    // Navigate to a project
    await page.locator('[data-testid="project-card"]').first().click()
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Switch to Tasks tab
    await page.getByRole('tab', { name: 'Tasks' }).click()
    
    // Click New Task button
    await page.locator('[data-testid="new-task-button"]').click()
    
    // Fill in task details
    await page.locator('[data-testid="task-title-input"]').fill('Test Task')
    await page.locator('[data-testid="task-description-input"]').fill('This is a test task description')
    
    // Select priority
    await page.locator('[data-testid="task-priority-select"]').click()
    await page.locator('text=High').click()
    
    // Create the task
    await page.locator('[data-testid="create-task-button"]').click()
    
    // Verify task appears in the list
    await expect(page.locator('text=Test Task')).toBeVisible({ timeout: 5000 })
  })

  test('should use global search', async ({ page }) => {
    // Open global search with keyboard shortcut
    await page.keyboard.press('Meta+K') // Cmd+K on Mac
    
    // Wait for search dialog
    await expect(page.locator('[data-testid="global-search-dialog"]')).toBeVisible()
    
    // Type in search
    const searchInput = page.locator('[data-testid="global-search-input"]')
    await searchInput.fill('test')
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 3000 })
    
    // Check that results are displayed
    const results = page.locator('[data-testid="search-result-item"]')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)
    
    // Close search with Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="global-search-dialog"]')).not.toBeVisible()
  })

  test('should navigate to settings', async ({ page }) => {
    // Click on Settings link
    await page.locator('text=Settings').click()
    
    // Wait for settings page
    await page.waitForURL(/\/settings/)
    
    // Check settings tabs exist
    await expect(page.getByRole('tab', { name: 'Account' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Notifications' })).toBeVisible()
    
    // Test theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    await themeToggle.click()
    
    // Verify theme changed (check for dark class on html element)
    const htmlElement = page.locator('html')
    const isDark = await htmlElement.evaluate(el => el.classList.contains('dark'))
    expect(isDark).toBeDefined()
  })

  test('should handle @mentions in chat', async ({ page }) => {
    // Navigate to a project with chat
    await page.locator('[data-testid="project-card"]').first().click()
    await page.waitForURL(/\/projects\/[a-f0-9]+/)
    
    // Ensure chat interface is visible
    const newConversationInput = page.locator('[data-testid="new-conversation-input"]')
    if (await newConversationInput.isVisible()) {
      await newConversationInput.fill('Test thread for mentions')
      await newConversationInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-interface"]')
    }
    
    // Type @ to trigger mention autocomplete
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('@')
    
    // Wait for autocomplete dropdown
    await expect(page.locator('[data-testid="mention-autocomplete"]')).toBeVisible({ timeout: 3000 })
    
    // Select first suggestion
    await page.locator('[data-testid="mention-suggestion"]').first().click()
    
    // Complete the message
    await messageInput.fill(await messageInput.inputValue() + ' check this out!')
    await messageInput.press('Enter')
    
    // Verify message with mention was sent
    const sentMessage = page.locator('[data-testid="chat-message"]').last()
    await expect(sentMessage).toContainText('@')
  })

  test('should handle logout', async ({ page }) => {
    // Click logout button
    await page.locator('[data-testid="logout-button"]').click()
    
    // Should redirect to login page
    await page.waitForURL(/\/login|\/auth|\/$/)
    
    // Login form should be visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })
})

test.describe('Mobile Responsive Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('should show mobile navigation', async ({ page }) => {
    await page.goto('http://localhost:3001')
    
    // Mobile menu button should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    // Click to open mobile menu
    await page.locator('[data-testid="mobile-menu-button"]').click()
    
    // Sidebar should slide in
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible()
    
    // Click outside to close
    await page.locator('body').click({ position: { x: 300, y: 100 } })
    
    // Sidebar should be hidden
    await expect(page.locator('[data-testid="mobile-sidebar"]')).not.toBeVisible()
  })

  test('should handle swipe gestures', async ({ page }) => {
    await page.goto('http://localhost:3001')
    await page.locator('[data-testid="project-card"]').first().click()
    
    // Simulate swipe right to open sidebar
    await page.locator('[data-testid="swipeable-area"]').first().evaluate(el => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 10, clientY: 100 } as Touch]
      })
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch]
      })
      el.dispatchEvent(touchStart)
      el.dispatchEvent(touchEnd)
    })
    
    // Sidebar should be visible
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible()
  })
})