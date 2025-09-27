# Failure Scenario Testing Guide

## Test Scenarios for Authentication Edge Cases

### 1. **Database User Deletion Test**

**What should happen**: System should automatically recreate the user entry and continue authentication normally.

**Test Steps**:
1. Authenticate successfully once
2. Delete your user from the database:
   ```sql
   DELETE FROM users WHERE wallet_id = 'your_wallet_address_lowercase';
   ```
3. Try to authenticate again
4. **Expected Result**: Authentication should succeed and recreate the user entry

**Backend Behavior**: The `ensureUser()` function should detect the missing user and recreate it automatically.

### 2. **Invalid/Expired JWT Token Test**

**What should happen**: System should detect invalid token, clear storage, and prompt re-authentication.

**Test Steps**:
1. Authenticate successfully
2. Manually corrupt the stored token in extension:
   - Right-click extension → "Inspect popup"
   - Go to Application tab → Storage → Extension storage
   - Change `accessToken` to `"invalid_token"`
3. Try to use "Add Context" button on ChatGPT/Claude
4. **Expected Result**: Should show "Authentication Required" notification and clear invalid tokens

### 3. **Backend Offline Test**

**What should happen**: Show connection error with retry instructions.

**Test Steps**:
1. Stop the backend server
2. Try to authenticate from extension
3. **Expected Result**: Should show connection error after retry attempts fail

### 4. **Frontend Offline Test**

**What should happen**: Extension should detect popup connection failure.

**Test Steps**:
1. Stop the frontend server (port 3001)
2. Try to authenticate from extension
3. **Expected Result**: Popup window should fail to load, extension should detect this

### 5. **Network Interruption Test**

**What should happen**: Automatic retries should handle transient failures.

**Test Steps**:
1. Start authentication process
2. Temporarily disconnect internet during nonce/verification
3. Reconnect before timeout
4. **Expected Result**: Should retry and eventually succeed

### 6. **Wallet Rejection Test**

**What should happen**: Should handle user rejecting signature gracefully.

**Test Steps**:
1. Start authentication
2. When wallet prompts for signature, click "Reject"
3. **Expected Result**: Should show authentication failed message without crashing

### 7. **Multiple Extension Instances Test**

**What should happen**: Session tracking should prevent conflicts.

**Test Steps**:
1. Open multiple browser windows with extension
2. Try to authenticate in both simultaneously
3. **Expected Result**: Each should maintain its own session without conflicts

### 8. **Popup Blocker Test**

**What should happen**: Should detect blocked popup and show instructions.

**Test Steps**:
1. Enable popup blocker for the extension site
2. Try to authenticate
3. **Expected Result**: Should alert user to allow popups

### 9. **Window Close During Auth Test**

**What should happen**: Should clean up properly without leaving hanging listeners.

**Test Steps**:
1. Start authentication process
2. Manually close the popup window before completion
3. Try to authenticate again
4. **Expected Result**: Should work normally on retry

### 10. **Token Expiration During Usage Test**

**What should happen**: Should detect expired token and prompt re-authentication.

**Test Steps**:
1. Authenticate successfully
2. Modify JWT secret in backend `.env` (this invalidates all tokens)
3. Try to use "Add Context" button
4. **Expected Result**: Should detect invalid token and prompt re-authentication

## Testing Commands

### Database Operations
```sql
-- Connect to your database and run these commands

-- Check current user
SELECT * FROM users WHERE wallet_id = 'your_wallet_address_here';

-- Delete user (for testing)
DELETE FROM users WHERE wallet_id = 'your_wallet_address_here';

-- Verify deletion
SELECT COUNT(*) FROM users WHERE wallet_id = 'your_wallet_address_here';
```

### Extension Storage Inspection
1. Right-click extension icon → "Inspect popup"
2. Application tab → Storage → Extension storage
3. Look for: `accessToken`, `walletAddress`, `walletConnected`

### Network Simulation
```bash
# Block specific ports (macOS/Linux)
sudo pfctl -f /dev/stdin <<EOF
block drop on lo0 inet proto tcp from any to 127.0.0.1 port 3000
EOF

# Restore (macOS/Linux) 
sudo pfctl -f /etc/pf.conf
```

## Expected Behaviors

### ✅ **Correct Responses**

1. **Missing User**: Auto-recreates user entry, continues normally
2. **Invalid Token**: Shows auth notification, clears storage, prompts re-auth
3. **Network Issues**: Shows specific error messages, provides retry options
4. **Wallet Rejection**: Graceful error message, allows retry
5. **Window Management**: Proper cleanup, no memory leaks

### ❌ **What Should NOT Happen**

1. **Silent Failures**: No errors without user notification
2. **Infinite Loops**: Continuous retry without user control
3. **Data Corruption**: Invalid tokens persisting in storage
4. **Memory Leaks**: Event listeners not cleaned up
5. **Crashes**: Extension or page becoming unresponsive

## Debugging Tools

### Console Logs to Watch
```bash
# Extension popup console
- "Authentication data saved to chrome storage"
- "Received authentication success"

# Content script console (ChatGPT/Claude page)
- "Authentication expired, tokens cleared"
- "Fetching context from backend"

# Backend logs
- "✅ Verification successful!"
- "👤 User ensured in database"
```

### Network Tab Monitoring
- `GET /api/nonce` - Should return random string
- `POST /api/verify` - Should return success with token
- `POST /api/v1/list-memories` - Should work with valid token

## Recovery Procedures

If system gets into bad state:

### Reset Extension State
```javascript
// In extension popup console
chrome.storage.local.clear();
```

### Reset Database User
```sql
DELETE FROM users WHERE wallet_id = 'your_wallet_address';
```

### Reset Backend Cache
```bash
# If using Redis
redis-cli FLUSHALL
```

This comprehensive testing will ensure your authentication system handles all edge cases gracefully and provides a robust user experience.