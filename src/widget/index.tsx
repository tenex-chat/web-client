import React from 'react';
import ReactDOM from 'react-dom/client';
import { Widget } from './Widget';
import '../styles/globals.css';

function initWidget() {
  // Find the script tag with data-project-id attribute
  // We use querySelectorAll and take the first match since there should only be one widget script
  const scripts = document.querySelectorAll('script[data-project-id]');
  const widgetScript = scripts[0] as HTMLScriptElement | undefined;
  
  const projectId = widgetScript?.getAttribute('data-project-id');

  if (!projectId) {
    console.error(
      'TENEX Widget: Missing data-project-id attribute on script tag',
      { foundScripts: scripts.length, widgetScript }
    );
    return;
  }

  // Create a container for the widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'tenex-widget-root';
  
  // Set widget container styles to prevent interference with host page
  widgetContainer.style.position = 'fixed';
  widgetContainer.style.zIndex = '999999';
  widgetContainer.style.pointerEvents = 'none';
  widgetContainer.style.top = '0';
  widgetContainer.style.left = '0';
  widgetContainer.style.width = '100%';
  widgetContainer.style.height = '100%';

  // Apply pointer events to child elements
  const style = document.createElement('style');
  style.textContent = `
    #tenex-widget-root > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);

  // Append to body
  document.body.appendChild(widgetContainer);

  // Render the widget
  const root = ReactDOM.createRoot(widgetContainer);
  root.render(
    <React.StrictMode>
      <Widget projectId={projectId} />
    </React.StrictMode>
  );
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}

export { Widget };