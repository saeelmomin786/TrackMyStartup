# Console Log Debugging Guide

## Quick Test

Open your browser console (F12) and run this in the console:

```javascript
console.log('TEST: Console is working!');
console.error('TEST: Error logs work!');
console.warn('TEST: Warning logs work!');
```

If you see these messages, console is working. If not, check browser settings.

## Common Issues

### 1. Console Filter Settings
- Open DevTools (F12)
- Go to Console tab
- Check the filter dropdown (top right)
- Make sure it's set to "All levels" or "Verbose"
- NOT just "Errors" or "Warnings"

### 2. Console Cleared
- Check if "Preserve log" is checked (prevents clearing on navigation)
- Look for a "Clear console" button - make sure it wasn't clicked

### 3. Production Mode Suppression
The code suppresses logs in production. Check if you're on:
- `trackmystartup.com` - logs are suppressed
- `localhost` or other domains - logs should work

### 4. Browser Console Settings
- Chrome: Settings → Console → Uncheck "Hide network messages"
- Firefox: Settings → Console → Check "Show all messages"

## Test Console in Your App

Add this to any component to test:

```typescript
useEffect(() => {
  console.log('🔍 TEST: Component mounted');
  console.error('❌ TEST: Error log test');
  console.warn('⚠️ TEST: Warning log test');
  
  // Test with alert too
  alert('If you see this, JavaScript is running!');
}, []);
```

## Check Current Environment

Run this in browser console:
```javascript
console.log('Host:', window.location.host);
console.log('Is production?', window.location.host.endsWith('trackmystartup.com'));
```




