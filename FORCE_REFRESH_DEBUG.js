// Force refresh startup dashboard - Add this to browser console
// This will help debug what's happening

// 1. Check if the startup dashboard component is loaded
console.log('🔍 Checking startup dashboard...');

// 2. Force reload the offers
if (window.location.href.includes('startup')) {
  console.log('🚀 Startup page detected, forcing offer reload...');
  
  // Dispatch a custom event to trigger offer reload
  window.dispatchEvent(new CustomEvent('forceOfferReload'));
  
  // Also try to find and call the loadOffersReceived function
  setTimeout(() => {
    console.log('⏰ Attempting to reload offers after 2 seconds...');
    // This will trigger a page refresh to reload offers
    window.location.reload();
  }, 2000);
} else {
  console.log('❌ Not on startup page');
}








