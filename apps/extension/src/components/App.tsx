import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [isOnChatGPT, setIsOnChatGPT] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Check if we're on ChatGPT or Claude
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        const isChatGPT = currentTab.url.includes('chatgpt.com') || currentTab.url.includes('chat.openai.com');
        const isClaude = currentTab.url.includes('claude.ai');
        setIsOnChatGPT(isChatGPT || isClaude);
      }
    });

    // Check for existing wallet connection and authentication
    chrome.storage.local.get(['walletAddress', 'walletConnected', 'accessToken'], async (result) => {
      if (result.walletConnected && result.walletAddress && result.accessToken) {
        // Verify token is still valid by checking backend
        try {
          const response = await fetch('http://localhost:3000/api/me', {
            headers: {
              'Authorization': `Bearer ${result.accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            setWalletAddress(result.walletAddress);
            setIsWalletConnected(true);
          } else {
            // Token is invalid, clear storage
            console.log('Stored token is invalid, clearing authentication data');
            chrome.storage.local.remove(['walletAddress', 'walletConnected', 'accessToken', 'refreshToken', 'connectedAt']);
          }
        } catch (error) {
          console.error('Error validating stored token:', error);
          // Network error - keep the stored state but don't auto-clear
          setWalletAddress(result.walletAddress);
          setIsWalletConnected(true);
        }
      }
    });

    // No longer need chrome.runtime message handling since we removed background script
    // The connectWallet function now handles postMessage communication directly
  }, []);

  const openChatGPT = () => {
    chrome.tabs.create({ url: 'https://chatgpt.com' });
  };

  const openClaude = () => {
    chrome.tabs.create({ url: 'https://claude.ai' });
  };

  const connectWallet = () => {
    // Generate a unique session ID for this auth attempt
    const sessionId = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Create wallet window URL with session tracking
    const walletUrl = `http://localhost:3001/wallet?sessionId=${sessionId}&origin=extension`;
    const walletWindow = window.open(walletUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    if (!walletWindow) {
      console.error('Could not open wallet window - popup might be blocked');
      alert('Please allow popups for this extension to authenticate with your wallet.');
      return;
    }

    // Set up robust message handling with timeout
    let authTimeout: NodeJS.Timeout;
    let windowCheckInterval: NodeJS.Timeout;
    
    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (authTimeout) clearTimeout(authTimeout);
      if (windowCheckInterval) clearInterval(windowCheckInterval);
    };

    // Listen for messages from the wallet window
    const handleMessage = (event: MessageEvent) => {
      // Be more permissive with origin to handle localhost variations
      const allowedOrigins = ['http://localhost:3001', 'http://127.0.0.1:3001'];
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      // Verify this message is for our session
      if (event.data.sessionId && event.data.sessionId !== sessionId) {
        return;
      }

      if (event.data.type === 'AUTH_SUCCESS') {
        console.log('Received authentication success:', event.data);
        
        setWalletAddress(event.data.address);
        setIsWalletConnected(true);
        
        // Store authentication data in chrome storage with callback
        chrome.storage.local.set({
          walletAddress: event.data.address,
          walletConnected: true,
          accessToken: event.data.accessToken,
          refreshToken: event.data.refreshToken || null,
          connectedAt: event.data.timestamp || Date.now(),
          sessionId: sessionId
        }, () => {
          console.log('Authentication data saved to chrome storage');
        });

        cleanup();
        
        // Close the wallet window if it's still open
        if (!walletWindow.closed) {
          walletWindow.close();
        }
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error('Authentication failed:', event.data.error);
        
        cleanup();
        
        // Show user-friendly error message
        alert(`Authentication failed: ${event.data.error || 'Unknown error occurred'}`);
      } else if (event.data.type === 'AUTH_READY') {
        console.log('Wallet window is ready for authentication');
      }
    };

    // Add the message listener
    window.addEventListener('message', handleMessage);

    // Set up timeout for authentication (2 minutes)
    authTimeout = setTimeout(() => {
      cleanup();
      if (!walletWindow.closed) {
        walletWindow.close();
      }
      console.error('Authentication timeout');
      alert('Authentication timed out. Please try again.');
    }, 120000);

    // Check if window is closed manually with better frequency
    windowCheckInterval = setInterval(() => {
      if (walletWindow.closed) {
        cleanup();
        console.log('Wallet window was closed manually');
      }
    }, 500);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsWalletConnected(false);
    chrome.storage.local.remove(['walletAddress', 'walletConnected', 'accessToken', 'refreshToken', 'connectedAt']);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', width: '280px' }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>AI Context Logger</h2>
      
      {/* Wallet Connection Status */}
      <div style={{ 
        marginBottom: '15px',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        {isWalletConnected ? (
          <div style={{ 
            background: '#d4edda', 
            color: '#155724',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔗 Authenticated</div>
            <div style={{ fontSize: '11px', wordBreak: 'break-all' }}>
              {walletAddress && formatAddress(walletAddress)}
            </div>
            <button 
              onClick={disconnectWallet}
              style={{
                marginTop: '5px',
                padding: '4px 8px',
                fontSize: '10px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Not Authenticated</div>
            <button 
              onClick={connectWallet}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Authenticate
            </button>
          </div>
        )}
      </div>
      
      {isOnChatGPT ? (
        <div>
          <div style={{ 
            background: '#d4edda', 
            color: '#155724', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            ✅ Extension active on AI platform!
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px 0' }}>
            Look for the white "Add Context" button next to the send button.
          </p>
          <p style={{ fontSize: '12px', color: '#888', margin: '0' }}>
            Click it to fetch context from global memory and enhance your text!
          </p>
        </div>
      ) : (
        <div>
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            ⚠️ Navigate to ChatGPT or Claude to use this extension
          </div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <button onClick={openChatGPT} style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#10a37f',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}>
              Open ChatGPT
            </button>
            <button onClick={openClaude} style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}>
              Open Claude
            </button>
          </div>
        </div>
      )}
      
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>How to use:</strong><br/>
        1. Go to chatgpt.com or claude.ai<br/>
        2. Type your message in the input field<br/>
        3. Click the white "Add Context" button<br/>
        4. Wait for context to load and enhance your text<br/>
        5. Use the platform's send button to send when ready!
      </div>
    </div>
  );
};

export default App;
