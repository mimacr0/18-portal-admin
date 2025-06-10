// Simplified loading screen functions
function showLoadingScreen() {
    document.getElementById('loading-screen').classList.add('active');
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').classList.remove('active');
}

// Export the functions to be used in layout.js
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
