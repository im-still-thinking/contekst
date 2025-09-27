// Content script to inject button into Claude input field
(() => {
console.log('Claude Input Logger Extension loaded');

// Global error handler to prevent page crashes
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('removeChild')) {
    console.log('Caught removeChild error, preventing page crash:', event.error);
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('removeChild')) {
    console.log('Caught unhandled removeChild rejection, preventing page crash:', event.reason);
    event.preventDefault();
  }
});

// Function to find the Claude input field
function findClaudeInput(): HTMLElement | null {
  // Common selectors for Claude input field - updated based on actual HTML structure
  const selectors = [
    'div[contenteditable="true"][role="textbox"][aria-label*="Claude"]', // Most specific for Claude
    'div[contenteditable="true"][role="textbox"]', // Generic contenteditable textbox
    'div[contenteditable="true"].ProseMirror', // ProseMirror editor class
    'div[contenteditable="true"][data-testid="basic-text-input"]', // Claude's main input
    'div[contenteditable="true"]', // Any contenteditable div
    'textarea[placeholder*="Talk to Claude"]',
    'textarea[placeholder*="Message Claude"]',
    'textarea'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of Array.from(elements)) {
      const htmlElement = element as HTMLElement;
      
      // Additional validation to ensure this is actually an input field
      if (htmlElement && (htmlElement.tagName === 'TEXTAREA' || htmlElement.contentEditable === 'true')) {
        // Check if it's visible and likely an active input
        const rect = htmlElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log('Found Claude input with selector:', selector, htmlElement);
          return htmlElement;
        }
      }
    }
  }
  return null;
}

// Function to find Claude's send button and its container for positioning
function findSendButtonContainer(): { container: HTMLElement; sendButton: HTMLElement } | null {
  // Updated selectors for Claude send button based on actual structure
  const sendButtonSelectors = [
    'button[aria-label="Send message"]', // Exact match for Claude's send button
    'button[aria-label*="Send"]',
    'button[type="button"][aria-label*="Send"]', // Claude uses type="button", not "submit"
    'button:has(svg)'
  ];

  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of Array.from(buttons)) {
      const buttonElement = button as HTMLElement;
      // Check if this looks like a send button
      const buttonText = buttonElement.textContent?.toLowerCase() || '';
      const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
      const buttonType = buttonElement.getAttribute('type');
      const hasSendIcon = buttonElement.querySelector('svg');
      
      // More specific check for Claude's send button
      if (ariaLabel.includes('send') || 
          (buttonType === 'button' && hasSendIcon && ariaLabel.includes('message')) ||
          ariaLabel === 'send message') {
        
        // Check if button is visible
        const rect = buttonElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const container = buttonElement.parentElement;
          if (container) {
            console.log('Found Claude send button and container:', { button: buttonElement, container });
            return { container, sendButton: buttonElement };
          }
        }
      }
    }
  }
  
  // Enhanced fallback: look for buttons near the input field with better container detection
  const inputElement = findClaudeInput();
  if (inputElement) {
    // Try multiple container strategies based on Claude's structure
    const containerSelectors = [
      '[class*="composer"]',
      '[class*="input"]', 
      '[class*="chat-input"]',
      '[class*="message-input"]',
      'form',
      '[role="group"]'
    ];
    
    let inputContainer: Element | null = null;
    for (const containerSelector of containerSelectors) {
      inputContainer = inputElement.closest(containerSelector);
      if (inputContainer) break;
    }
    
    // Fallback to parent elements if no specific container found
    if (!inputContainer) {
      inputContainer = inputElement.parentElement?.parentElement || inputElement.parentElement;
    }
    
    if (inputContainer) {
      const buttons = inputContainer.querySelectorAll('button');
      for (const button of Array.from(buttons)) {
        const buttonElement = button as HTMLElement;
        const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
        const hasSvg = buttonElement.querySelector('svg');
        
        // Look for buttons that might be send buttons
        if (buttonElement.offsetWidth > 0 && buttonElement.offsetHeight > 0) {
          const rect = buttonElement.getBoundingClientRect();
          const inputRect = inputElement.getBoundingClientRect();
          
          // Check if this could be a send button based on position and attributes
          const isNearInput = Math.abs(rect.top - inputRect.top) < 100;
          const isRightOfInput = rect.left >= inputRect.left;
          const hasRelevantLabel = ariaLabel.includes('send') || ariaLabel.includes('submit');
          const looksLikeSendButton = hasSvg && (hasRelevantLabel || isNearInput);
          
          if (looksLikeSendButton && isRightOfInput) {
            const container = buttonElement.parentElement;
            if (container) {
              console.log('Found Claude send button container by enhanced detection:', { 
                button: buttonElement, 
                container,
                ariaLabel,
                position: { top: rect.top, left: rect.left }
              });
              return { container, sendButton: buttonElement };
            }
          }
        }
      }
    }
  }
  
  return null;
}

// Function to get the input value from Claude
function getInputValue(inputElement: HTMLElement): string {
  if (inputElement.tagName === 'TEXTAREA') {
    return (inputElement as HTMLTextAreaElement).value;
  } else if (inputElement.contentEditable === 'true') {
    // Handle Claude's ProseMirror contenteditable div
    if (inputElement.classList.contains('ProseMirror')) {
      // Extract text from paragraph elements, joining with newlines
      const paragraphs = inputElement.querySelectorAll('p');
      const textLines: string[] = [];
      
      paragraphs.forEach(p => {
        // Skip empty placeholder paragraphs
        if (p.classList.contains('is-empty') && p.getAttribute('data-placeholder')) {
          return;
        }
        
        // Get text content, treating empty paragraphs as empty lines
        const text = p.textContent || '';
        textLines.push(text);
      });
      
      return textLines.join('\n');
    } else {
      // Regular contenteditable div or other Claude input variants
      return inputElement.innerText || inputElement.textContent || '';
    }
  }
  return '';
}

// Function to set text into the Claude input field
function setInputValue(inputElement: HTMLElement, text: string): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).value = text;
    // Trigger input event to notify React/Vue of the change
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (inputElement.contentEditable === 'true') {
    // Handle Claude's ProseMirror contenteditable div
    if (inputElement.classList.contains('ProseMirror')) {
      // This is Claude's ProseMirror editor - handle newlines properly
      const lines = text.split('\n');
      
      // Clear existing content
      inputElement.innerHTML = '';
      
      // Create paragraph elements for each line
      lines.forEach((line, index) => {
        const p = document.createElement('p');
        if (line.trim() === '') {
          // Empty line - add placeholder and break
          if (index === lines.length - 1) {
            p.setAttribute('data-placeholder', 'Reply to Claude...');
            p.classList.add('is-empty');
          }
          const br = document.createElement('br');
          br.classList.add('ProseMirror-trailingBreak');
          p.appendChild(br);
        } else {
          // Non-empty line - add text content
          p.textContent = line;
        }
        inputElement.appendChild(p);
      });
      
      // Focus the element and place cursor at the end
      inputElement.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && inputElement.lastChild) {
        range.selectNodeContents(inputElement.lastChild);
        range.collapse(false); // Collapse to end
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // Regular contenteditable div - use innerText
      inputElement.innerText = text;
      
      // Focus the element and place cursor at the end
      inputElement.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection) {
        range.selectNodeContents(inputElement);
        range.collapse(false); // Collapse to end
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // Trigger input events to notify the application
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Backend API configuration
const API_BASE_URL = 'http://localhost:3000';

// Global variable to store captured images
let capturedImages: { base64: string; filename: string; timestamp: number }[] = [];

// Check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(!!result.accessToken);
    });
  });
}

// Get access token
async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(result.accessToken || null);
    });
  });
}

// Function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Function to capture and store image
async function captureImage(file: File): Promise<void> {
  try {
    console.log('Capturing image:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const base64 = await fileToBase64(file);
    const imageData = {
      base64,
      filename: file.name,
      timestamp: Date.now()
    };
    
    capturedImages.push(imageData);
    
    console.log('Image captured and stored:', {
      filename: file.name,
      size: file.size,
      type: file.type,
      base64Length: base64.length,
      totalImages: capturedImages.length
    });
    
    // Log the first 100 characters of base64 for verification
    console.log('Base64 preview:', base64.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('Error capturing image:', error);
  }
}

// Show notification with different types
function showNotification(type: 'auth' | 'error' | 'success', message: string, duration: number = 5000): void {
  // Remove existing notifications first
  const existingNotifications = document.querySelectorAll('[data-contekst-notification]');
  existingNotifications.forEach(notification => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  });

  const notification = document.createElement('div');
  notification.setAttribute('data-contekst-notification', 'true');
  
  let bgColor, borderColor, textColor, icon;
  
  switch (type) {
    case 'auth':
      bgColor = '#fee2e2';
      borderColor = '#fca5a5';
      textColor = '#dc2626';
      icon = '🔐';
      break;
    case 'error':
      bgColor = '#fef2f2';
      borderColor = '#f87171';
      textColor = '#dc2626';
      icon = '❌';
      break;
    case 'success':
      bgColor = '#f0fdf4';
      borderColor = '#86efac';
      textColor = '#16a34a';
      icon = '✅';
      break;
  }
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    border: 1px solid ${borderColor};
    color: ${textColor};
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add CSS animation
  if (!document.querySelector('#contekst-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'contekst-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">${icon} ${type === 'auth' ? 'Authentication Required' : type === 'error' ? 'Error' : 'Success'}</div>
    <div style="font-size: 12px;">${message}</div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, duration);
}

// Show auth required notification
function showAuthRequiredNotification(): void {
  showNotification('auth', 'Please authenticate in the extension popup to use Contekst features.');
}

// Global flags to prevent multiple setups
let imageUploadInterceptionSetup = false;

// Function to setup image upload interception
function setupImageUploadInterception(): void {
  if (imageUploadInterceptionSetup) {
    return; // Already setup, skip
  }
  
  console.log('Setting up image upload interception for Claude...');
  imageUploadInterceptionSetup = true;
  
  // Intercept file input changes
  const interceptFileInput = (input: HTMLInputElement) => {
    if (input.type === 'file' && !input.hasAttribute('data-image-intercepted')) {
      console.log('Found file input, setting up interception:', input);
      input.setAttribute('data-image-intercepted', 'true');
      
      input.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        
        if (files && files.length > 0) {
          console.log(`File input changed, ${files.length} files selected`);
          
          for (const file of Array.from(files)) {
            // Check if it's an image file
            if (file.type.startsWith('image/')) {
              await captureImage(file);
            } else {
              console.log('Non-image file detected:', file.name, file.type);
            }
          }
        }
      });
    }
  };
  
  // Find existing file inputs
  const existingInputs = document.querySelectorAll('input[type="file"]');
  existingInputs.forEach((input) => interceptFileInput(input as HTMLInputElement));
  
  // Monitor for new file inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const element = node as Element;
          
          // Check if the added node is a file input
          if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'file') {
            interceptFileInput(element as HTMLInputElement);
          }
          
          // Check if the added node contains file inputs
          const fileInputs = element.querySelectorAll?.('input[type="file"]');
          if (fileInputs) {
            fileInputs.forEach((input) => interceptFileInput(input as HTMLInputElement));
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also intercept drag and drop events
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  
  document.addEventListener('drop', async (event) => {
    event.preventDefault();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      console.log(`Drag and drop detected, ${files.length} files dropped`);
      
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await captureImage(file);
        } else {
          console.log('Non-image file dropped:', file.name, file.type);
        }
      }
    }
  });
  
  console.log('Image upload interception setup complete');
}

// Function to save prompt to backend
async function savePromptToBackend(prompt: string): Promise<void> {
  try {
    console.log('Saving Claude prompt to backend:', prompt);
    
    const token = await getAccessToken();
    if (!token) {
      console.log('No access token available, skipping save');
      return;
    }

    // Include captured images if any
    const requestBody: any = { 
      prompt: prompt,
      source: 'claude.ai',
      entity: 'claude.ai'
    };

    if (capturedImages.length > 0) {
      requestBody.images = capturedImages.map(img => ({
        base64: img.base64,
        filename: img.filename
      }));
      console.log(`Including ${capturedImages.length} captured images in the request`);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/memory/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 401) {
      // Clear invalid tokens
      chrome.storage.local.remove(['accessToken', 'refreshToken', 'walletAddress', 'walletConnected']);
      console.log('Authentication expired, tokens cleared');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Claude prompt saved successfully:', result);

    // Clear captured images after successful save
    if (capturedImages.length > 0) {
      console.log(`Clearing ${capturedImages.length} captured images after successful save`);
      capturedImages = [];
    }
  } catch (error) {
    console.error('Error saving Claude prompt to backend:', error);
    // Don't throw error for background saves to avoid disrupting user flow
  }
}

// Function to get context from backend API
async function fetchContextFromAPI(originalText: string): Promise<string> {
  try {
    console.log('Fetching context from backend for Claude prompt:', originalText);
    
    const token = await getAccessToken();
    if (!token) {
      showAuthRequiredNotification();
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}api/v1/memory/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userPrompt: originalText,
        source: 'claude.ai',
        entity: 'claude.ai'
      }),
    });

    if (response.status === 401) {
      // Clear invalid tokens
      chrome.storage.local.remove(['accessToken', 'refreshToken', 'walletAddress', 'walletConnected']);
      showAuthRequiredNotification();
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Context fetched from backend for Claude:', result);
    
    // Extract summaries from memories array and format them
    if (result.success && result.memories && result.memories.length > 0) {
      const summaries = result.memories.map((memory: any) => memory.extractedMemory);
      const contextString = summaries.map((summary: string) => `- ${summary}`).join('\n');
      return `${originalText}\n\nContext:\n${contextString}`;
    } else {
      // If no memories found, return original text
      console.log('No memories found for context');
      return originalText;
    }
  } catch (error) {
    console.error('Error fetching context from backend for Claude:', error);
    throw error;
  }
}

// Function to show loading state in Claude input
function showLoadingState(inputElement: HTMLElement): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).placeholder = 'fetching context from global memory...';
    inputElement.style.opacity = '0.7';
  } else if (inputElement.contentEditable === 'true') {
    // For Claude's ProseMirror contenteditable div
    if (inputElement.classList.contains('ProseMirror')) {
      // Clear existing content and add loading message as a paragraph
      inputElement.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'fetching context from global memory...';
      inputElement.appendChild(p);
    } else {
      // Regular contenteditable div
      inputElement.innerText = 'fetching context from global memory...';
    }
    inputElement.style.opacity = '0.7';
    inputElement.style.fontStyle = 'italic';
    inputElement.style.color = '#666';
  }
}

// Function to hide loading state in Claude input
function hideLoadingState(inputElement: HTMLElement): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).placeholder = '';
    inputElement.style.opacity = '1';
  } else if (inputElement.contentEditable === 'true') {
    inputElement.style.opacity = '1';
    inputElement.style.fontStyle = 'normal';
    inputElement.style.color = '';
  }
}

// Function to save prompt to backend without interfering with normal send
async function savePromptBeforeSend(inputValue: string): Promise<void> {
  try {
    // Save the prompt to backend (fire and forget - don't wait)
    savePromptToBackend(inputValue).catch(error => {
      console.error('Background Claude save failed:', error);
    });
    console.log('Claude prompt save initiated in background');
    
    // Schedule multiple button repositioning checks after message is likely sent
    // This is more aggressive to handle Claude's complex layout changes
    const checkTimes = [1000, 2000, 3000, 5000]; // Check at multiple intervals
    
    checkTimes.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`Button position check ${index + 1} after message send (${delay}ms)...`);
        const existingButton = document.getElementById('claude-context-btn');
        const currentInput = findClaudeInput();
        
        if (!existingButton) {
          console.log('Button missing, reinitializing...');
          injectButton();
        } else if (currentInput) {
          // Check if button is still properly positioned
          const buttonRect = existingButton.getBoundingClientRect();
          const inputRect = currentInput.getBoundingClientRect();
          
          const horizontalDistance = Math.abs(buttonRect.left - inputRect.right);
          const verticalDistance = Math.abs(buttonRect.top - inputRect.top);
          
          if (horizontalDistance > 200 || verticalDistance > 100) {
            console.log('Button is mispositioned, repositioning...', {
              horizontalDistance,
              verticalDistance
            });
            existingButton.remove();
            setTimeout(() => injectButton(), 100);
          }
        }
      }, delay);
    });
    
  } catch (error) {
    console.error('Error initiating Claude prompt save:', error);
  }
}

// Function to setup send button interception (non-blocking approach)
function setupSendButtonInterception(): void {
  const sendButtonSelectors = [
    'button[aria-label="Send message"]', // Exact match for Claude's send button
    'button[aria-label*="Send"]',
    'button[type="button"][aria-label*="Send"]', // Claude uses type="button"
    'button:has(svg)'
  ];
  
  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of Array.from(buttons)) {
      const buttonElement = button as HTMLElement;
      
      // Skip our own context button
      if (buttonElement.id === 'claude-context-btn') continue;
      
      // Check if this looks like a send button and hasn't been intercepted yet
      const buttonText = buttonElement.textContent?.toLowerCase() || '';
      const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
      const buttonType = buttonElement.getAttribute('type');
      const hasSendIcon = buttonElement.querySelector('svg');
      const isIntercepted = buttonElement.hasAttribute('data-save-intercepted');
      
      if (!isIntercepted && (
        ariaLabel.includes('send') || 
        (buttonType === 'button' && hasSendIcon && ariaLabel.includes('message')) ||
        ariaLabel === 'send message'
      )) {
        console.log('Setting up non-blocking save interception for Claude send button:', buttonElement);
        
        // Mark as intercepted to avoid duplicate setup
        buttonElement.setAttribute('data-save-intercepted', 'true');
        
        // Add event listener that doesn't interfere with normal functionality
        buttonElement.addEventListener('click', (event) => {
          // Don't prevent default - let Claude work normally
          
          // Get current input value and save it in background
          const inputElement = findClaudeInput();
          if (inputElement) {
            const inputValue = getInputValue(inputElement);
            if (inputValue.trim()) {
              console.log('Claude send button clicked, saving prompt in background:', inputValue);
              
              // Save in background without blocking the send
              savePromptBeforeSend(inputValue);
            }
          }
        }, { capture: true }); // Use capture to run before other handlers
      }
    }
  }
  
  // Also setup keyboard interception for Enter key
  setupEnterKeyInterception();
}

// Global variable to track if global Enter key capture is set up
let globalEnterKeyCaptureSetup = false;

// Function to setup global Enter key capture (most reliable for ProseMirror)
function setupGlobalEnterKeyCapture(): void {
  if (globalEnterKeyCaptureSetup) {
    return;
  }
  
  globalEnterKeyCaptureSetup = true;
  console.log('Setting up global Enter key capture for Claude');
  
  // Global early keydown capture for Enter to snapshot the very first send
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // Check if we're focused on Claude's input
      const activeElement = document.activeElement;
      if (activeElement) {
        const isClaudeInput = 
          (activeElement as Element).matches('div[contenteditable="true"]') ||
          (activeElement as Element).matches('textarea') ||
          (activeElement as Element).matches('p[data-placeholder*="Claude"]') ||
          (activeElement as Element).matches('p[data-placeholder*="help"]') ||
          (activeElement as Element).classList.contains('ProseMirror');
        
        if (isClaudeInput) {
          const inputValue = getInputValue(activeElement as HTMLElement);
          if (inputValue && inputValue.trim()) {
            console.log('Global Enter key captured for Claude input, saving prompt:', inputValue);
            savePromptBeforeSend(inputValue);
          }
        }
      }
    }
  }, { capture: true });
}

// Function to setup Enter key interception for saving prompts
function setupEnterKeyInterception(): void {
  // Listen for Enter key presses on the input field
  const inputElement = findClaudeInput();
  if (inputElement && !inputElement.hasAttribute('data-enter-intercepted')) {
    console.log('Setting up Enter key interception for Claude input field');
    inputElement.setAttribute('data-enter-intercepted', 'true');
    
    // Enhanced Enter key handler based on reference implementation
    inputElement.addEventListener('keydown', function (event: Event) {
      const keyboardEvent = event as KeyboardEvent;
      // Check if Enter was pressed without Shift (standard send behavior)
      if (
        keyboardEvent.key === 'Enter' &&
        !keyboardEvent.shiftKey &&
        !keyboardEvent.ctrlKey &&
        !keyboardEvent.metaKey
      ) {
        // Don't process for textarea which may want newlines
        if (inputElement.tagName.toLowerCase() !== 'textarea') {
          // Get current input value and save it in background
          const inputValue = getInputValue(inputElement);
          if (inputValue && inputValue.trim() !== '') {
            console.log('Enter key pressed in Claude, saving prompt in background:', inputValue);
            
            // Save in background without blocking the send
            savePromptBeforeSend(inputValue);
          }
        }
      }
    }, { capture: true });
    
    // Keep a live cache during typing to improve reliability
    if (!inputElement.hasAttribute('data-cache-listener')) {
      inputElement.setAttribute('data-cache-listener', 'true');
      let lastTypedCache = '';
      
      const updateCache = () => {
        const val = getInputValue(inputElement);
        if (val && val.trim() !== '') {
          lastTypedCache = val;
        }
      };
      
      inputElement.addEventListener('input', updateCache, true);
      inputElement.addEventListener('compositionend', updateCache, true);
      
      // Store cache reference for potential use
      (inputElement as any)._lastTypedCache = () => lastTypedCache;
    }
  }
}

// Function to trigger Claude's send functionality
function triggerSendMessage(): void {
  console.log('Triggering Claude send message...');
  
  // Method 1: Find and click the visible send button with updated selectors
  const sendButtonSelectors = [
    'button[aria-label="Send message"]', // Exact match for Claude's send button
    'button[aria-label*="Send"]',
    'button[type="button"][aria-label*="Send"]'
  ];
  
  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of Array.from(buttons)) {
      const buttonElement = button as HTMLButtonElement;
      
      // Skip our own context button and ensure it's visible
      if (buttonElement.id !== 'claude-context-btn' && buttonElement.offsetWidth > 0) {
        const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
        
        // More specific check for Claude's actual send button
        if (ariaLabel.includes('send')) {
          console.log('Found Claude send button, clicking it:', buttonElement);
          try {
            // Ensure the button is enabled before clicking
            if (!buttonElement.disabled) {
              buttonElement.click();
              return;
            } else {
              console.log('Send button is disabled, skipping');
            }
          } catch (error) {
            console.log('Error clicking Claude send button:', error);
          }
        }
      }
    }
  }
  
  // Method 2: Trigger Enter key press on the input (fallback)
  const inputElement = findClaudeInput();
  if (inputElement) {
    console.log('Triggering Enter key press on Claude input');
    
    // Focus the input first
    inputElement.focus();
    
    // Create a more realistic Enter key event
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    inputElement.dispatchEvent(enterEvent);
    return;
  }
  
  console.log('All Claude send trigger methods failed');
}

// Function to create and inject the "Add Context" button alongside the send button
function injectButton() {
  const inputElement = findClaudeInput();
  
  if (!inputElement) {
    console.log('Claude input field not found, retrying...');
    return false;
  }

  // Check if button already exists and is properly positioned
  const existingButton = document.getElementById('claude-context-btn');
  if (existingButton) {
    // Check if the button is still properly positioned relative to input
    const buttonRect = existingButton.getBoundingClientRect();
    const inputRect = inputElement.getBoundingClientRect();
    
    // If button is far from input (indicating layout shift), remove and recreate
    const distance = Math.abs(buttonRect.top - inputRect.top) + Math.abs(buttonRect.left - inputRect.left);
    if (distance > 200) { // Threshold for "too far away"
      console.log('Existing button is mispositioned, removing and recreating...', {
        buttonPos: { top: buttonRect.top, left: buttonRect.left },
        inputPos: { top: inputRect.top, left: inputRect.left },
        distance
      });
      existingButton.remove();
    } else {
      console.log('Button already exists and is properly positioned');
      return true;
    }
  }

  console.log('Claude input field found, adding context button...');

  // Find the send button container for positioning
  const sendButtonInfo = findSendButtonContainer();

  // Create our "Add Context" button
  const button = document.createElement('button');
  button.id = 'claude-context-btn';
  button.type = 'button'; // Prevent form submission
  button.innerHTML = 'Add Context';
  
  // Style the button as a fully rounded white button with black text
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    color: black;
    border: 1px solid #d1d5db;
    border-radius: 50px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    padding: 8px 16px;
    margin-right: 8px;
    height: 36px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    outline: none;
    white-space: nowrap;
    min-width: fit-content;
  `;

  // Add hover and active effects
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f9fafb';
    button.style.borderColor = '#9ca3af';
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = 'white';
    button.style.borderColor = '#d1d5db';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  });

  button.addEventListener('mousedown', () => {
    button.style.transform = 'translateY(0) scale(0.98)';
  });

  button.addEventListener('mouseup', () => {
    button.style.transform = 'translateY(-1px) scale(1)';
  });

  // Add click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check authentication first
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      showAuthRequiredNotification();
      return;
    }
    
    const inputValue = getInputValue(inputElement);
    console.log('Original Claude Input Value:', inputValue);
    
    // Show loading state
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Loading...';
    button.style.background = '#f3f4f6';
    button.style.borderColor = '#9ca3af';
    button.style.color = '#6b7280';
    button.disabled = true;
    
    // Show loading state in input
    showLoadingState(inputElement);
    
    try {
      // Fetch context from API
      const enhancedText = await fetchContextFromAPI(inputValue);
      
      // Hide loading state
      hideLoadingState(inputElement);
      
      // Set the enhanced text back into the input field
      setInputValue(inputElement, enhancedText);
      
      // Success feedback
      button.innerHTML = '✓ Context Added';
      button.style.background = '#dcfce7';
      button.style.borderColor = '#22c55e';
      button.style.color = '#15803d';
      
      const contextLines = enhancedText.split('\n').filter(line => line.startsWith('- ')).length;
      if (contextLines > 0) {
        showNotification('success', `Added ${contextLines} relevant context item${contextLines > 1 ? 's' : ''} to your message.`, 3000);
      } else {
        showNotification('success', 'No additional context found for this query.', 3000);
      }
      
      console.log(`Context added to Claude: "${enhancedText}"`);
      
    } catch (error) {
      console.error('Error fetching context for Claude:', error);
      
      // Hide loading state
      hideLoadingState(inputElement);
      
      // Error feedback with notification
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Authentication')) {
        button.innerHTML = '🔒 Auth Required';
        button.style.background = '#fef3c7';
        button.style.borderColor = '#f59e0b';
        button.style.color = '#92400e';
        showNotification('auth', 'Please reconnect your wallet in the extension popup.');
      } else {
        button.innerHTML = '❌ Error';
        button.style.background = '#fef2f2';
        button.style.borderColor = '#f87171';
        button.style.color = '#dc2626';
        showNotification('error', `Failed to fetch context: ${errorMessage}`);
      }
    } finally {
      // Reset button after a delay
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'white';
        button.style.borderColor = '#d1d5db';
        button.style.color = 'black';
        button.disabled = false;
      }, 2000);
    }
  });

  // Position the button alongside the send button
  if (sendButtonInfo) {
    const { container: sendButtonContainer, sendButton } = sendButtonInfo;
    
    // Ensure the container has flex display for horizontal layout
    sendButtonContainer.style.display = 'flex';
    sendButtonContainer.style.alignItems = 'center';
    sendButtonContainer.style.gap = '8px';
    sendButtonContainer.style.flexDirection = 'row';
    
    // Insert the button right before the send button
    sendButtonContainer.insertBefore(button, sendButton);
    console.log('Claude context button injected alongside send button!');
  } else {
    // Fallback: Create a horizontal button container
    const inputContainer = inputElement.closest('[class*="input"]') || 
                          inputElement.closest('[class*="composer"]') ||
                          inputElement.closest('form') ||
                          inputElement.closest('[role="group"]') ||
                          inputElement.parentElement;
    
    if (inputContainer) {
      // Look for existing send buttons in the container with updated selectors
      const existingSendButtons = inputContainer.querySelectorAll('button[aria-label="Send message"], button[aria-label*="Send"], button[type="button"][aria-label*="Send"]');
      
      if (existingSendButtons.length > 0) {
        // Create a wrapper div for horizontal layout
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          flex-direction: row;
        `;
        
        const sendButton = existingSendButtons[0] as HTMLElement;
        const sendButtonParent = sendButton.parentElement;
        
        if (sendButtonParent) {
          // Insert wrapper before send button
          sendButtonParent.insertBefore(buttonWrapper, sendButton);
          // Move both buttons into wrapper
          buttonWrapper.appendChild(button);
          buttonWrapper.appendChild(sendButton);
          console.log('Claude context button injected with wrapper for horizontal layout!');
        }
      } else {
        inputContainer.appendChild(button);
        console.log('Claude context button injected in input container!');
      }
    } else {
      // Last resort: append to document body with absolute positioning
      document.body.appendChild(button);
      
      // Position it near the input field
      const inputRect = inputElement.getBoundingClientRect();
      button.style.position = 'fixed';
      button.style.top = `${inputRect.top + window.scrollY}px`;
      button.style.left = `${inputRect.right - 150 + window.scrollX}px`;
      button.style.zIndex = '9999';
      
      console.log('Claude context button injected with fallback positioning!');
    }
  }

  return true;
}

// Function to initialize the extension
function initialize() {
  console.log('Initializing Claude Input Logger Extension...');
  
  // Setup global Enter key capture first (most reliable for ProseMirror)
  setupGlobalEnterKeyCapture();
  
  // Try to inject the button and setup interception immediately
  const buttonInjected = injectButton();
  setupSendButtonInterception();
  setupImageUploadInterception();
  
  if (buttonInjected) {
    setupContinuousMonitoring();
    return;
  }

  // If not successful, set up observers and retry
  let attempts = 0;
  const maxAttempts = 20;
  
  const retryInterval = setInterval(() => {
    attempts++;
    
    const success = injectButton();
    setupSendButtonInterception(); // Always try to setup interception
    setupImageUploadInterception(); // Always try to setup image interception
    
    if (success || attempts >= maxAttempts) {
      clearInterval(retryInterval);
      if (attempts >= maxAttempts) {
        console.log('Failed to find Claude input field after maximum attempts');
      } else {
        setupContinuousMonitoring();
      }
    }
  }, 1000);

  // Also observe DOM changes in case the input is loaded dynamically
  const observer = new MutationObserver(() => {
    const success = injectButton();
    setupSendButtonInterception(); // Always try to setup interception on DOM changes
    setupImageUploadInterception(); // Always try to setup image interception on DOM changes
    
    if (success) {
      observer.disconnect();
      clearInterval(retryInterval);
      setupContinuousMonitoring();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Clean up observer after some time
  setTimeout(() => {
    observer.disconnect();
  }, 30000);
}

// Function to continuously monitor for our context button and send button interception
function setupContinuousMonitoring() {
  console.log('Setting up continuous monitoring for Claude context button, send button interception, Enter key handling, image upload interception, and DOM changes...');
  
  // Track the current input field position to detect layout changes
  let lastInputRect: DOMRect | null = null;
  let lastInputParent: Element | null = null;
  let lastInputElement: HTMLElement | null = null;
  
  // Debounce mechanism to prevent excessive button recreation
  let repositionTimeout: number | undefined;
  let lastRepositionTime = 0;
  
  // Debounced repositioning function to prevent flickering
  const debouncedReposition = (reason: string) => {
    const now = Date.now();
    const timeSinceLastReposition = now - lastRepositionTime;
    
    // Don't reposition more than once every 2 seconds
    if (timeSinceLastReposition < 2000) {
      console.log(`Skipping reposition due to debounce (${reason})`);
      return;
    }
    
    if (repositionTimeout) {
      clearTimeout(repositionTimeout);
    }
    
    repositionTimeout = window.setTimeout(() => {
      console.log(`Debounced reposition triggered: ${reason}`);
      const existingButton = document.getElementById('claude-context-btn');
      if (existingButton) {
        existingButton.remove();
      }
      setTimeout(() => {
        injectButton();
        lastRepositionTime = Date.now();
      }, 100);
    }, 500); // Wait 500ms before repositioning
  };
  
  // Monitor for our button disappearing and new send buttons appearing
  const buttonObserver = new MutationObserver((mutations) => {
    let shouldReinject = false;
    
    // Check if our button still exists
    const existingButton = document.getElementById('claude-context-btn');
    const currentInput = findClaudeInput();
    
    if (!existingButton) {
      console.log('Our Claude context button disappeared, reinitializing...');
      shouldReinject = true;
    } else if (currentInput) {
      // Check if input field has changed or moved significantly
      const currentRect = currentInput.getBoundingClientRect();
      const currentParent = currentInput.closest('[class*="composer"]') || 
                           currentInput.closest('[class*="input"]') || 
                           currentInput.closest('[class*="chat-input"]') ||
                           currentInput.closest('[class*="message-input"]') ||
                           currentInput.closest('form') ||
                           currentInput.closest('[role="group"]') ||
                           currentInput.parentElement;
      
      // Check if the input element itself changed (different DOM element)
      const inputChanged = lastInputElement && lastInputElement !== currentInput;
      
      // Check if input position changed significantly or parent changed
      if (lastInputRect && lastInputParent) {
        const positionChanged = Math.abs(currentRect.top - lastInputRect.top) > 30 ||
                               Math.abs(currentRect.left - lastInputRect.left) > 30;
        const parentChanged = currentParent !== lastInputParent;
        
        // Additional check: if only the height changed (likely due to content changes), 
        // don't reposition unless the change is very significant
        const heightChanged = Math.abs(currentRect.height - lastInputRect.height) > 50;
        const widthChanged = Math.abs(currentRect.width - lastInputRect.width) > 30;
        
        if (positionChanged || parentChanged || inputChanged || widthChanged) {
          console.log('Input field changed, scheduling reposition...', {
            positionChanged,
            parentChanged,
            inputChanged,
            heightChanged,
            widthChanged,
            oldTop: lastInputRect.top,
            newTop: currentRect.top,
            oldLeft: lastInputRect.left,
            newLeft: currentRect.left,
            oldHeight: lastInputRect.height,
            newHeight: currentRect.height
          });
          debouncedReposition('input field changed');
        } else if (heightChanged) {
          // Only reposition for height changes if it's very significant (likely layout change, not content)
          console.log('Significant height change detected, checking if repositioning needed...', {
            oldHeight: lastInputRect.height,
            newHeight: currentRect.height,
            heightDiff: Math.abs(currentRect.height - lastInputRect.height)
          });
          // For now, don't reposition for height changes alone - they're usually just content changes
        }
      }
      
      // Also check if button is still properly positioned relative to input
      if (existingButton && currentInput) {
        const buttonRect = existingButton.getBoundingClientRect();
        const inputRect = currentInput.getBoundingClientRect();
        
        // Check if button is too far from input (indicating layout shift)
        const horizontalDistance = Math.abs(buttonRect.left - inputRect.right);
        const verticalDistance = Math.abs(buttonRect.top - inputRect.top);
        
        if (horizontalDistance > 200 || verticalDistance > 100) {
          console.log('Button is mispositioned relative to input, scheduling reposition...', {
            buttonPos: { top: buttonRect.top, left: buttonRect.left },
            inputPos: { top: inputRect.top, left: inputRect.left, right: inputRect.right },
            horizontalDistance,
            verticalDistance
          });
          debouncedReposition('button mispositioned');
        }
      }
      
      // Update tracking
      lastInputRect = currentRect;
      lastInputParent = currentParent;
      lastInputElement = currentInput;
    }
    
    // Check for significant DOM changes that might affect button positioning
    let significantChange = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check if new elements were added that might affect layout
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === 1) {
            const element = node as Element;
            
            // Skip if this is just content being added to ProseMirror (like <p> tags from Shift+Enter)
            if (element.tagName === 'P' || element.tagName === 'BR' || element.tagName === 'SPAN') {
              // These are normal content additions to ProseMirror, not significant layout changes
              continue;
            }
            
            // Look for elements that might contain or affect the input area
            // But exclude direct children of ProseMirror editor (which are just content)
            const isProseMirrorChild = element.closest('.ProseMirror') && 
                                     element.closest('.ProseMirror') !== element;
            
            if (!isProseMirrorChild && element.querySelector && (
              element.querySelector('div[contenteditable="true"]') ||
              element.querySelector('[class*="input"]') ||
              element.querySelector('[class*="composer"]') ||
              element.querySelector('[class*="chat"]') ||
              element.matches('[class*="input"]') ||
              element.matches('[class*="composer"]') ||
              element.matches('[class*="chat"]') ||
              element.matches('[role="textbox"]')
            )) {
              significantChange = true;
              break;
            }
          }
        }
        
        // Also check for removed nodes that might have contained our button
        for (const node of Array.from(mutation.removedNodes)) {
          if (node.nodeType === 1) {
            const element = node as Element;
            if (element.querySelector && element.querySelector('#claude-context-btn')) {
              console.log('Button was removed with parent element');
              significantChange = true;
              break;
            }
          }
        }
      }
      if (significantChange) break;
    }
    
    if (significantChange) {
      console.log('Significant DOM change detected, checking button positioning...');
      // Small delay to let DOM settle
      setTimeout(() => {
        const button = document.getElementById('claude-context-btn');
        const currentInput = findClaudeInput();
        
        if (!button) {
          console.log('Button missing after DOM change, reinitializing...');
          injectButton();
        } else if (currentInput) {
          // Additional check: only reposition if button is actually mispositioned
          const buttonRect = button.getBoundingClientRect();
          const inputRect = currentInput.getBoundingClientRect();
          
          const horizontalDistance = Math.abs(buttonRect.left - inputRect.right);
          const verticalDistance = Math.abs(buttonRect.top - inputRect.top);
          
          // Only reposition if button is significantly mispositioned
          if (horizontalDistance > 200 || verticalDistance > 100) {
            console.log('Button mispositioned after DOM change, scheduling reposition...', {
              horizontalDistance,
              verticalDistance
            });
            debouncedReposition('DOM change mispositioned button');
          } else {
            console.log('Button still properly positioned after DOM change, keeping it');
          }
        }
      }, 300);
    }
    
    // Only handle immediate reinjection if button is completely missing
    if (!existingButton && currentInput) {
      console.log('Button completely missing, immediate reinjection needed');
      setTimeout(() => {
        injectButton();
      }, 200);
    }
    
    // Always try to setup send button interception for new buttons
    setupSendButtonInterception();
    
    // Always try to setup image upload interception for new elements
    setupImageUploadInterception();
    
    // Always try to setup Enter key interception for new input fields
    setupEnterKeyInterception();
  });
  
  // Additional DOM monitoring for input clearing (indicates message was sent)
  setupInputClearingMonitor();

  buttonObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true, // Also observe attribute changes
    attributeFilter: ['class', 'style'] // Watch for class/style changes that might affect layout
  });

  // Keep the observer running indefinitely for this session
  console.log('Continuous monitoring active for Claude context button, send interception, Enter key handling, image upload interception, and DOM changes');
  
  // Additional periodic check to ensure button remains visible
  setInterval(() => {
    const existingButton = document.getElementById('claude-context-btn');
    const currentInput = findClaudeInput();
    
    if (!existingButton && currentInput) {
      console.log('Periodic check: Button missing, reinitializing...');
      injectButton();
    } else if (existingButton && currentInput) {
      // Check if button is still visible and properly positioned
      const buttonRect = existingButton.getBoundingClientRect();
      const inputRect = currentInput.getBoundingClientRect();
      
      // Button should be visible (non-zero dimensions)
      const buttonVisible = buttonRect.width > 0 && buttonRect.height > 0;
      const inputVisible = inputRect.width > 0 && inputRect.height > 0;
      
      if (!buttonVisible && inputVisible) {
        console.log('Periodic check: Button not visible, reinitializing...');
        existingButton.remove();
        setTimeout(() => injectButton(), 100);
      } else if (buttonVisible && inputVisible) {
        // Check positioning
        const horizontalDistance = Math.abs(buttonRect.left - inputRect.right);
        const verticalDistance = Math.abs(buttonRect.top - inputRect.top);
        
        if (horizontalDistance > 300 || verticalDistance > 150) {
          console.log('Periodic check: Button mispositioned, scheduling reposition...', {
            horizontalDistance,
            verticalDistance,
            buttonPos: { top: buttonRect.top, left: buttonRect.left },
            inputPos: { top: inputRect.top, left: inputRect.left, right: inputRect.right }
          });
          debouncedReposition('periodic check mispositioned');
        }
      }
    }
  }, 10000); // Check every 10 seconds
}

// Function to monitor input clearing as a signal that message was sent
function setupInputClearingMonitor(): void {
  let lastInputValue = '';
  let inputClearingObserver: MutationObserver | undefined;
  
  function findAndObserveInput() {
    const inputElement = findClaudeInput();
    if (inputElement && !inputElement.hasAttribute('data-clearing-monitored')) {
      console.log('Setting up input clearing monitor for Claude');
      inputElement.setAttribute('data-clearing-monitored', 'true');
      
      // Disconnect any existing observer
      if (inputClearingObserver) {
        inputClearingObserver.disconnect();
      }
      
      inputClearingObserver = new MutationObserver(() => {
        const currentValue = getInputValue(inputElement) || '';
        
        // Check if input was cleared (had content, now empty)
        if (lastInputValue.trim() && !currentValue.trim()) {
          console.log('Input cleared detected, saving prompt:', lastInputValue);
          savePromptBeforeSend(lastInputValue);
        }
        
        lastInputValue = currentValue;
      });
      
      inputClearingObserver.observe(inputElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      
      // Also listen for input events to track changes
      inputElement.addEventListener('input', () => {
        lastInputValue = getInputValue(inputElement) || '';
      });
      
      // Initialize with current value
      lastInputValue = getInputValue(inputElement) || '';
    }
  }
  
  // Find and observe input initially
  findAndObserveInput();
  
  // Re-find input periodically in case DOM changes
  setInterval(findAndObserveInput, 5000);
}

// Wait for the page to load and then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle window resize events that might affect button positioning
let resizeTimeout: number | undefined;
window.addEventListener('resize', () => {
  // Debounce resize events
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  
  resizeTimeout = window.setTimeout(() => {
    console.log('Window resized, checking button positioning...');
    const button = document.getElementById('claude-context-btn');
    if (button) {
      // Force repositioning by removing and recreating button
      button.remove();
      setTimeout(() => {
        injectButton();
      }, 100);
    }
  }, 500);
});

// Also try to reinitialize when navigating within the SPA
let currentURL = location.href;
new MutationObserver(() => {
  if (location.href !== currentURL) {
    currentURL = location.href;
    console.log('Claude navigation detected, reinitializing...');
    setTimeout(initialize, 2000); // Wait a bit for the new page to load
  }
}).observe(document, { subtree: true, childList: true });

})(); // End of Claude content script IIFE


