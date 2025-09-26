// Background service worker for capturing wallet address via redirect URL

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const updatedUrl = changeInfo.url || tab.url;
  if (!updatedUrl) return;

  try {
    const url = new URL(updatedUrl);
    const isLocalWalletSuccess =
      (url.origin === 'http://localhost:3001' || url.origin === 'https://localhost:3001') &&
      url.pathname === '/wallet-success';

    if (!isLocalWalletSuccess) return;

    const address = url.searchParams.get('address');
    if (!address) return;

    chrome.storage.local.set(
      {
        walletAddress: address,
        walletConnected: true,
        connectedAt: Date.now(),
      },
      () => {
        // Notify all extension views (popup) that connection updated
        chrome.runtime.sendMessage({ type: 'WALLET_CONNECTED', address, timestamp: Date.now() });
        // Close the tab to return focus to the extension/user
        chrome.tabs.remove(tabId);
      }
    );
  } catch (_) {
    // noop
  }
});







