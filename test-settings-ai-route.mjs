#!/usr/bin/env node

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:3001';

async function testSettingsAIRoute() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Add console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page console error:', msg.text());
      }
    });

    // Enable test mode
    console.log('Testing direct navigation to /settings/ai with test mode...');
    await page.goto(`${TEST_URL}/settings/ai?test-mode=true`, {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    // Wait a bit for any redirects to complete
    await page.waitForTimeout(2000);

    // Check the final URL
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    // Check if we're on the settings page
    const isOnSettings = finalUrl.includes('/settings');
    const hasAITab = finalUrl.includes('tab=ai');
    
    if (isOnSettings && hasAITab) {
      console.log('✅ Successfully navigated to settings page with AI tab');
      
      // Verify the AI Settings content is visible
      const aiSettingsVisible = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="ai-settings-content"]');
        if (element) return true;
        
        // Also check for text content
        const pageText = document.body.innerText;
        return pageText.includes('AI Settings') || pageText.includes('AI Provider');
      });
      
      if (aiSettingsVisible) {
        console.log('✅ AI Settings content is visible');
      } else {
        console.log('⚠️ AI Settings content not found');
      }
    } else {
      console.log(`❌ Navigation failed. Expected settings page with AI tab, got: ${finalUrl}`);
      
      // Log page content for debugging
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Page content preview:', bodyText);
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
console.log('Starting settings/ai route test...');
testSettingsAIRoute();