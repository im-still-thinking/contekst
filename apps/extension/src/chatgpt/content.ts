// Content script to inject button into ChatGPT input field
(() => {
console.log('ChatGPT Input Logger Extension loaded');

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

// Function to find the ChatGPT input field
function findChatGPTInput(): HTMLElement | null {
  // Common selectors for ChatGPT input field (these may change over time)
  const selectors = [
    '#prompt-textarea', // Current ChatGPT ProseMirror input
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][data-virtualkeyboard="true"]',
    'textarea[placeholder*="Send a message"]',
    'textarea[placeholder*="Message ChatGPT"]',
    'textarea[placeholder*="Ask anything"]',
    'textarea[data-id="root"]',
    'div[contenteditable="true"]',
    'textarea'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && (element.tagName === 'TEXTAREA' || element.contentEditable === 'true')) {
      return element;
    }
  }
  return null;
}

// Function to find ChatGPT's send button container for positioning
function findSendButtonContainer(): HTMLElement | null {
  // Common selectors for ChatGPT send button
  const sendButtonSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    'button svg[data-icon="send"]',
    'button:has(svg[data-icon="send"])',
    '[data-testid="send-button"]',
    'button:has([data-testid="send-button-icon"])',
    'button[data-testid="fruitjuice-send-button"]'
  ];

  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of Array.from(buttons)) {
      const buttonElement = button as HTMLElement;
      // Check if this looks like a send button
      const buttonText = buttonElement.textContent?.toLowerCase() || '';
      const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
      const hasSubmitType = buttonElement.getAttribute('type') === 'submit';
      const hasSendIcon = buttonElement.querySelector('svg[data-icon="send"]') || 
                          buttonElement.querySelector('[data-testid="send-button-icon"]');
      
      if (buttonText.includes('send') || 
          ariaLabel.includes('send') || 
          hasSubmitType || 
          hasSendIcon ||
          selector.includes('send')) {
        
        console.log('Found send button container:', buttonElement.parentElement);
        return buttonElement.parentElement; // Return the parent container for positioning our button
      }
    }
  }
  
  // Fallback: look for buttons near the input field
  const inputElement = findChatGPTInput();
  if (inputElement) {
    const inputContainer = inputElement.closest('[class*="input"]') || 
                          inputElement.closest('[class*="composer"]') ||
                          inputElement.closest('form') ||
                          inputElement.parentElement;
    
    if (inputContainer) {
      const buttons = inputContainer.querySelectorAll('button');
      for (const button of Array.from(buttons)) {
        const buttonElement = button as HTMLElement;
        // Look for buttons that might be send buttons
        if (buttonElement.offsetWidth > 0 && buttonElement.offsetHeight > 0) {
          const rect = buttonElement.getBoundingClientRect();
          const inputRect = inputElement.getBoundingClientRect();
          
          // If button is positioned near the input field (likely a send button)
          if (Math.abs(rect.top - inputRect.top) < 50 && rect.left > inputRect.left) {
            console.log('Found send button container by position:', buttonElement.parentElement);
            return buttonElement.parentElement;
          }
        }
      }
    }
  }
  
  return null;
}

// Function to get the input value
function getInputValue(inputElement: HTMLElement): string {
  if (inputElement.tagName === 'TEXTAREA') {
    return (inputElement as HTMLTextAreaElement).value;
  } else if (inputElement.contentEditable === 'true') {
    // Handle ProseMirror contenteditable div (ChatGPT's current input format)
    if (inputElement.classList.contains('ProseMirror') || inputElement.id === 'prompt-textarea') {
      // For ProseMirror, get the text content from all <p> elements
      const paragraphs = inputElement.querySelectorAll('p');
      if (paragraphs.length > 0) {
        return Array.from(paragraphs)
          .map(p => p.textContent || '')
          .join('\n')
          .trim();
      }
      // Fallback to innerText/textContent
      return inputElement.innerText || inputElement.textContent || '';
    } else {
      // Regular contenteditable div
      return inputElement.innerText || inputElement.textContent || '';
    }
  }
  return '';
}

// Function to set text into the input field
function setInputValue(inputElement: HTMLElement, text: string): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).value = text;
    // Trigger input event to notify React/Vue of the change
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (inputElement.contentEditable === 'true') {
    // Handle ProseMirror contenteditable div
    if (inputElement.classList.contains('ProseMirror') || inputElement.id === 'prompt-textarea') {
      // For ProseMirror, we need to set the HTML structure properly
      const lines = text.split('\n');
      const htmlContent = lines.map(line => `<p>${line || '<br>'}</p>`).join('');
      inputElement.innerHTML = htmlContent;
      
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
      
      // Trigger input events to notify the application
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Regular contenteditable div
      inputElement.innerText = text;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
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
  
  console.log('Setting up image upload interception for ChatGPT...');
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
    console.log('Saving prompt to backend:', prompt);
    
    const token = await getAccessToken();
    if (!token) {
      console.log('No access token available, skipping save');
      return;
    }

    // Include captured images if any
    const requestBody: any = { 
      prompt: prompt,
      entity: 'chatgpt',
      source: 'chatgpt'
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
    console.log('Prompt saved successfully:', result);

    // Clear captured images after successful save
    if (capturedImages.length > 0) {
      console.log(`Clearing ${capturedImages.length} captured images after successful save`);
      capturedImages = [];
    }
  } catch (error) {
    console.error('Error saving prompt to backend:', error);
    // Don't throw error for background saves to avoid disrupting user flow
  }
}

// Function to get context from backend API
async function fetchContextFromAPI(originalText: string): Promise<string> {
  try {
    console.log('Fetching context from backend for:', originalText);
    
    const token = await getAccessToken();
    if (!token) {
      showAuthRequiredNotification();
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/memory/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userPrompt: originalText,
        entity: 'chatgpt',
        source: 'chatgpt'
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
    console.log('Context fetched from backend:', result);
    
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
    console.error('Error fetching context from backend:', error);
    throw error;
  }
}

// Function to show loading state in input
function showLoadingState(inputElement: HTMLElement): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).placeholder = 'fetching context from global memory...';
    inputElement.style.opacity = '0.7';
  } else if (inputElement.contentEditable === 'true') {
    // For ProseMirror, add a loading overlay
    if (inputElement.classList.contains('ProseMirror') || inputElement.id === 'prompt-textarea') {
      const loadingText = 'fetching context from global memory...';
      inputElement.innerHTML = `<p style="color: #666; font-style: italic;">${loadingText}</p>`;
      inputElement.style.opacity = '0.7';
    }
  }
}

// Function to hide loading state in input
function hideLoadingState(inputElement: HTMLElement): void {
  if (inputElement.tagName === 'TEXTAREA') {
    (inputElement as HTMLTextAreaElement).placeholder = '';
    inputElement.style.opacity = '1';
  } else if (inputElement.contentEditable === 'true') {
    inputElement.style.opacity = '1';
  }
}

// Function to save prompt to backend without interfering with normal send
async function savePromptBeforeSend(inputValue: string): Promise<void> {
  try {
    // Save the prompt to backend (fire and forget - don't wait)
    savePromptToBackend(inputValue).catch(error => {
      console.error('Background save failed:', error);
    });
    console.log('Prompt save initiated in background');
  } catch (error) {
    console.error('Error initiating prompt save:', error);
  }
}

// Function to setup send button interception (non-blocking approach)
function setupSendButtonInterception(): void {
  const sendButtonSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]'
  ];
  
  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of Array.from(buttons)) {
      const buttonElement = button as HTMLButtonElement;
      
      // Skip our own context button
      if (buttonElement.id === 'chatgpt-context-btn') continue;
      
      // Check if this looks like a send button and hasn't been intercepted yet
      const buttonText = buttonElement.textContent?.toLowerCase() || '';
      const ariaLabel = buttonElement.getAttribute('aria-label')?.toLowerCase() || '';
      const hasSubmitType = buttonElement.getAttribute('type') === 'submit';
      const isIntercepted = buttonElement.hasAttribute('data-save-intercepted');
      
      if (!isIntercepted && (
        buttonText.includes('send') || 
        ariaLabel.includes('send') || 
        hasSubmitType ||
        selector.includes('send')
      )) {
        console.log('Setting up non-blocking save interception for send button:', buttonElement);
        
        // Mark as intercepted to avoid duplicate setup
        buttonElement.setAttribute('data-save-intercepted', 'true');
        
        // Add event listener that doesn't interfere with normal functionality
        buttonElement.addEventListener('click', (event) => {
          // Don't prevent default or stop propagation - let ChatGPT work normally
          
          // Get current input value and save it in background
          const inputElement = findChatGPTInput();
          if (inputElement) {
            const inputValue = getInputValue(inputElement);
            if (inputValue.trim()) {
              console.log('Send button clicked, saving prompt in background:', inputValue);
              
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

// Function to setup Enter key interception for saving prompts
function setupEnterKeyInterception(): void {
  // Listen for Enter key presses on the input field
  const inputElement = findChatGPTInput();
  if (inputElement && !inputElement.hasAttribute('data-enter-intercepted')) {
    console.log('Setting up Enter key interception for input field');
    inputElement.setAttribute('data-enter-intercepted', 'true');
    
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        // Don't prevent default - let ChatGPT handle the send normally
        
        // Get current input value and save it in background
        const inputValue = getInputValue(inputElement);
        if (inputValue.trim()) {
          console.log('Enter key pressed, saving prompt in background:', inputValue);
          
          // Save in background without blocking the send
          savePromptBeforeSend(inputValue);
        }
      }
    }, { capture: true });
  }
}

// Function to trigger ChatGPT's send functionality
function triggerSendMessage(): void {
  console.log('Triggering send message...');
  
  // Method 1: Find and click the visible send button
  const sendButtonSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]'
  ];
  
  for (const selector of sendButtonSelectors) {
    const button = document.querySelector(selector) as HTMLButtonElement;
    if (button && button.id !== 'chatgpt-context-btn' && button.offsetWidth > 0) {
      console.log('Found send button, clicking it:', button);
      try {
        button.click();
        return;
      } catch (error) {
        console.log('Error clicking send button:', error);
      }
    }
  }
  
  // Method 2: Trigger Enter key press on the input (fallback)
  const inputElement = findChatGPTInput();
  if (inputElement) {
    console.log('Triggering Enter key press on input');
    
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
  
  console.log('All send trigger methods failed');
}

// Function to create and inject the "Add Context" button alongside the send button
function injectButton() {
  const inputElement = findChatGPTInput();
  
  if (!inputElement) {
    console.log('ChatGPT input field not found, retrying...');
    return false;
  }

  // Check if button already exists
  if (document.getElementById('chatgpt-context-btn')) {
    return true;
  }

  console.log('ChatGPT input field found, adding context button...');

  // Find the send button container for positioning
  const sendButtonContainer = findSendButtonContainer();

  // Create our "Add Context" button
  const button = document.createElement('button');
  button.id = 'chatgpt-context-btn';
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
    console.log('Original ChatGPT Input Value:', inputValue);
    
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
      
      console.log(`Context added: "${enhancedText}"`);
      
    } catch (error) {
      console.error('Error fetching context:', error);
      
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
      }, 3000);
    }
  });

  // Position the button alongside the send button
  if (sendButtonContainer) {
    // Ensure the container has flex display for horizontal layout
    sendButtonContainer.style.display = 'flex';
    sendButtonContainer.style.alignItems = 'center';
    sendButtonContainer.style.gap = '8px';
    
    // Insert the button before the send button
    sendButtonContainer.insertBefore(button, sendButtonContainer.firstChild);
    console.log('Context button injected alongside send button!');
  } else {
    // Fallback: find the input container and append there
    const inputContainer = inputElement.closest('[class*="input"]') || 
                          inputElement.closest('[class*="composer"]') ||
                          inputElement.closest('form') ||
                          inputElement.parentElement;
    
    if (inputContainer) {
      inputContainer.appendChild(button);
      console.log('Context button injected in input container!');
    } else {
      // Last resort: append to document body with absolute positioning
      document.body.appendChild(button);
      
      // Position it near the input field
      const inputRect = inputElement.getBoundingClientRect();
      button.style.position = 'fixed';
      button.style.top = `${inputRect.top + window.scrollY}px`;
      button.style.left = `${inputRect.right - 150 + window.scrollX}px`;
      button.style.zIndex = '9999';
      
      console.log('Context button injected with fallback positioning!');
    }
  }

  return true;
}

// Function to initialize the extension
function initialize() {
  console.log('Initializing ChatGPT Input Logger Extension...');
  
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
        console.log('Failed to find ChatGPT input field after maximum attempts');
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
  console.log('Setting up continuous monitoring for context button, send button interception, and image upload interception...');
  
  // Monitor for our button disappearing and new send buttons appearing
  const buttonObserver = new MutationObserver(() => {
    // Check if our button still exists
    if (!document.getElementById('chatgpt-context-btn')) {
      console.log('Our context button disappeared, reinitializing...');
      injectButton();
    }
    
    // Always try to setup send button interception for new buttons
    setupSendButtonInterception();
    // Always try to setup image upload interception for new elements
    setupImageUploadInterception();
  });

  buttonObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Keep the observer running indefinitely for this session
  console.log('Continuous monitoring active for context button, send interception, and image upload interception');
}

// Wait for the page to load and then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Also try to reinitialize when navigating within the SPA
let currentURL = location.href;
new MutationObserver(() => {
  if (location.href !== currentURL) {
    currentURL = location.href;
    console.log('Navigation detected, reinitializing...');
    setTimeout(initialize, 2000); // Wait a bit for the new page to load
  }
}).observe(document, { subtree: true, childList: true });

})(); // End of ChatGPT content script IIFE
