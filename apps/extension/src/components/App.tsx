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

    // Check for existing wallet connection
    chrome.storage.local.get(['walletAddress', 'walletConnected'], (result) => {
      if (result.walletConnected && result.walletAddress) {
        setWalletAddress(result.walletAddress);
        setIsWalletConnected(true);
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
    // Open wallet connection page in new window (not tab) so we can communicate via postMessage
    const walletWindow = window.open('http://localhost:3001/wallet', '_blank', 'width=500,height=600');
    
    if (!walletWindow) {
      console.error('Could not open wallet window - popup might be blocked');
      return;
    }

    // Listen for messages from the wallet window
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our wallet page
      if (event.origin !== 'http://localhost:3001') {
        return;
      }

      if (event.data.type === 'WALLET_CONNECTED') {
        console.log('Received wallet connection:', event.data);
        
        setWalletAddress(event.data.address);
        setIsWalletConnected(true);
        
        // Store in chrome storage
        chrome.storage.local.set({
          walletAddress: event.data.address,
          walletConnected: true,
          connectedAt: event.data.timestamp
        });

        // Clean up the message listener
        window.removeEventListener('message', handleMessage);
      }
    };

    // Add the message listener
    window.addEventListener('message', handleMessage);

    // Clean up listener if window is closed manually
    const checkClosed = setInterval(() => {
      if (walletWindow.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsWalletConnected(false);
    chrome.storage.local.remove(['walletAddress', 'walletConnected', 'connectedAt']);
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
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔗 Wallet Connected</div>
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
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ No Wallet Connected</div>
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
              Connect Wallet
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
