// FORCE REFRESH USER DATA - Run this in browser console
// This will force the application to refresh user data and clear any cached role information

console.log('🔄 Starting force refresh of user data...');

// Clear all localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cleared all local storage');

// Clear any cookies related to the app
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cleared all cookies');

// Force reload the page
console.log('🔄 Reloading page...');
window.location.reload();

// Alternative: If you want to manually trigger auth refresh
// Uncomment the lines below if the above doesn't work:

/*
// Get the current user from Supabase auth
const { data: { user }, error } = await supabase.auth.getUser();
console.log('Current auth user:', user);

// Force sign out and sign back in
await supabase.auth.signOut();
console.log('✅ Signed out');

// Wait a moment then reload
setTimeout(() => {
    window.location.reload();
}, 1000);
*/
