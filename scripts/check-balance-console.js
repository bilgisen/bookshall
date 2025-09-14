// This is a script to run in the browser console to check the balance
// 1. Open your browser's developer tools (F12 or right-click -> Inspect)
// 2. Go to the Console tab
// 3. Paste this code and press Enter

// Check if the useBalance hook is available
if (window.__NEXT_DATA__) {
  console.log('Next.js app detected');
  
  // Find the balance in the page
  const balanceElement = document.querySelector('[data-testid="credit-balance"]');
  if (balanceElement) {
    console.log('Balance element found:', balanceElement.textContent);
  } else {
    console.log('Balance element not found on page');
  }
  
  // Check if React DevTools is available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools detected, you can inspect components to find the balance');
  }
  
  // Try to find the balance in the Redux store if it's used
  if (window.__NEXT_REDUX_STORE__) {
    const state = window.__NEXT_REDUX_STORE__.getState();
    console.log('Redux store state:', state);
  }
} else {
  console.log('Next.js app not detected, make sure you\'re on the correct page');
}

// Check for any balance-related elements
const balanceElements = document.querySelectorAll('*[class*="balance"], *[id*="balance"]');
console.log(`Found ${balanceElements.length} elements that might contain balance information:`);
balanceElements.forEach((el, i) => {
  console.log(`Element ${i + 1}:`, el);
  console.log('Text content:', el.textContent);
});
