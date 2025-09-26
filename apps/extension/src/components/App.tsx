import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [isOnChatGPT, setIsOnChatGPT] = useState(false);

  useEffect(() => {
    // Check if we're on ChatGPT
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        const isChatGPT = currentTab.url.includes('chatgpt.com') || currentTab.url.includes('chat.openai.com');
        setIsOnChatGPT(isChatGPT);
      }
    });
  }, []);

  const openChatGPT = () => {
    chrome.tabs.create({ url: 'https://chatgpt.com' });
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', width: '280px' }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>AI Context Logger</h2>
      
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
            ✅ Extension active on ChatGPT!
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
            ⚠️ Navigate to ChatGPT to use this extension
          </div>
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
        1. Go to chatgpt.com<br/>
        2. Type your message in the input field<br/>
        3. Click the white "Add Context" button<br/>
        4. Wait for context to load and enhance your text<br/>
        5. Use ChatGPT's send button to send when ready!
      </div>
    </div>
  );
};

export default App;
