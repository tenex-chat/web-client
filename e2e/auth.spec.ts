import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login screen when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    
    // Check for login screen elements
    await expect(page.getByText('Welcome to TENEX')).toBeVisible()
    await expect(page.getByPlaceholder('nsec1...')).toBeVisible()
    await expect(page.getByRole('button', { name: /login with nostr/i })).toBeVisible()
  })
  
  test('should show error for invalid nsec format', async ({ page }) => {
    await page.goto('/login')
    
    // Enter invalid nsec
    await page.getByPlaceholder('nsec1...').fill('invalid-key')
    await page.getByRole('button', { name: /login with nostr/i }).click()
    
    // Should show error toast
    await expect(page.getByText('Invalid nsec format')).toBeVisible()
  })
  
  test('should login with valid nsec format', async ({ page }) => {
    await page.goto('/login')
    
    // Enter valid format nsec (but likely invalid key for testing)
    const testNsec = 'nsec1' + 'a'.repeat(58) // Valid format but fake key
    await page.getByPlaceholder('nsec1...').fill(testNsec)
    await page.getByRole('button', { name: /login with nostr/i }).click()
    
    // Should attempt login and either succeed or show connection error
    // Since this is a fake key, we expect an error
    await expect(page.getByText(/failed to login/i)).toBeVisible({ timeout: 10000 })
  })
  
  test('should clear password field after failed login', async ({ page }) => {
    await page.goto('/login')
    
    const testNsec = 'nsec1' + 'a'.repeat(58)
    const input = page.getByPlaceholder('nsec1...')
    
    await input.fill(testNsec)
    await expect(input).toHaveValue(testNsec)
    
    await page.getByRole('button', { name: /login with nostr/i }).click()
    
    // Wait for error and check field is cleared
    await expect(page.getByText(/failed to login/i)).toBeVisible({ timeout: 10000 })
    await expect(input).toHaveValue('')
  })
  
  test('should disable login button while logging in', async ({ page }) => {
    await page.goto('/login')
    
    const testNsec = 'nsec1' + 'a'.repeat(58)
    await page.getByPlaceholder('nsec1...').fill(testNsec)
    
    const loginButton = page.getByRole('button', { name: /login with nostr/i })
    await loginButton.click()
    
    // Button should be disabled and show loading state
    await expect(loginButton).toBeDisabled()
    await expect(page.getByText(/logging in/i)).toBeVisible()
  })

  test('mobile: should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
    }
    
    await page.goto('/login')
    
    // Check that login form is visible and properly sized on mobile
    const loginCard = page.locator('[class*="card"]').first()
    await expect(loginCard).toBeVisible()
    
    // Check that the form is not too wide for mobile
    const box = await loginCard.boundingBox()
    if (box) {
      expect(box.width).toBeLessThanOrEqual(400)
    }
  })
})