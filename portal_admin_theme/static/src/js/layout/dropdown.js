// Initialize language dropdown functionality
const systemInitLanguageDropdown = () => {
    const languageButton = document.getElementById('language-dropdown-button');
    const languageDropdown = document.getElementById('language-dropdown');

    if (!languageButton || !languageDropdown) return;

    // Toggle language dropdown on click
    languageButton.addEventListener('click', function(e) {
        e.stopPropagation();

        // Hide other dropdowns if open
        const userDropdown = document.getElementById('user-dropdown');
        const notificationDropdown = document.getElementById('notification-dropdown');

        if (userDropdown && !userDropdown.classList.contains('hidden')) {
            userDropdown.classList.add('hidden');
        }

        if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.add('hidden');
        }

        // Toggle language dropdown with animation
        languageDropdown.classList.toggle('hidden');
        if (!languageDropdown.classList.contains('hidden')) {
            languageDropdown.classList.add('notification-in');
            setTimeout(() => {
                languageDropdown.classList.remove('notification-in');
            }, 300);
        }
    });
}

// Add user dropdown initialization
const systemInitUserDropdown = () => {
    const userButton = document.getElementById('user-dropdown-button');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userButton || !userDropdown) return;

    // Toggle user dropdown on click
    userButton.addEventListener('click', function(e) {
        e.stopPropagation();

        // Hide other dropdowns if open
        const languageDropdown = document.getElementById('language-dropdown');
        const notificationDropdown = document.getElementById('notification-dropdown');

        if (languageDropdown && !languageDropdown.classList.contains('hidden')) {
            languageDropdown.classList.add('hidden');
        }

        if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.add('hidden');
        }

        // Toggle user dropdown
        userDropdown.classList.toggle('hidden');
    });
}

// Initialize notification dropdown functionality
const systemInitNotificationDropdown = () => {
    const notificationButton = document.getElementById('notification-dropdown-button');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (!notificationButton || !notificationDropdown) return;

    // Toggle notification dropdown on click
    notificationButton.addEventListener('click', function(e) {
        e.stopPropagation();

        // Hide user dropdown if open
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown && !userDropdown.classList.contains('hidden')) {
            userDropdown.classList.add('hidden');
        }

        // Toggle notification dropdown with animation
        if (notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.remove('hidden');
            notificationDropdown.classList.add('notification-in');

            // Remove animation class after animation completes
            setTimeout(() => {
                notificationDropdown.classList.remove('notification-in');
            }, 300);
        } else {
            notificationDropdown.classList.add('hidden');
        }
    });

    // Close notification dropdown when clicking outside
    document.addEventListener('click', function(e) {
        // Close notification dropdown if open
        const notificationDropdown = document.getElementById('notification-dropdown');
        const notificationButton = document.getElementById('notification-dropdown-button');
        if (notificationDropdown && !notificationDropdown.contains(e.target) &&
            notificationButton && !notificationButton.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }

        // Close language dropdown if open
        const languageDropdown = document.getElementById('language-dropdown');
        const languageButton = document.getElementById('language-dropdown-button');
        if (languageDropdown && !languageDropdown.contains(e.target) &&
            languageButton && !languageButton.contains(e.target)) {
            languageDropdown.classList.add('hidden');
        }

        // Close user dropdown if open
        const userDropdown = document.getElementById('user-dropdown');
        const userButton = document.getElementById('user-dropdown-button');
        if (userDropdown && !userDropdown.contains(e.target) &&
            userButton && !userButton.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }

        // Close history dropdown if open
        const historyDropdown = document.getElementById('history-dropdown');
        const historyButton = document.getElementById('history-dropdown-button');
        if (historyDropdown && !historyDropdown.contains(e.target) &&
            historyButton && !historyButton.contains(e.target)) {
            historyDropdown.classList.add('hidden');
        }
    });

    // Add functionality to "dismiss" buttons
    const dismissButtons = notificationDropdown.querySelectorAll('.notification-item button');
    dismissButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const notificationItem = this.closest('.notification-item');

            // Animate fade out
            notificationItem.style.opacity = '0';
            notificationItem.style.height = notificationItem.offsetHeight + 'px';
            notificationItem.style.marginTop = '0';
            notificationItem.style.marginBottom = '0';
            notificationItem.style.paddingTop = '0';
            notificationItem.style.paddingBottom = '0';

            // Add transition
            notificationItem.style.transition = 'all 0.3s ease';

            // Remove after animation
            setTimeout(() => {
                notificationItem.style.height = '0';
                setTimeout(() => {
                    notificationItem.remove();

                    // Update notification count
                    updateNotificationCount();
                }, 300);
            }, 100);
        });
    });

    // Function to update notification count
    function updateNotificationCount() {
        const unreadItems = notificationDropdown.querySelectorAll('.notification-item.unread').length;
        const countBadge = notificationDropdown.querySelector('.notification-count');

        if (countBadge) {
            if (unreadItems > 0) {
                countBadge.textContent = unreadItems + ' new';
                countBadge.classList.remove('hidden');

                // Show the red dot on the notification icon
                const notificationBadge = notificationButton.querySelector('span');
                if (notificationBadge) {
                    notificationBadge.classList.remove('hidden');
                }
            } else {
                countBadge.classList.add('hidden');

                // Hide the red dot on the notification icon
                const notificationBadge = notificationButton.querySelector('span');
                if (notificationBadge) {
                    notificationBadge.classList.add('hidden');
                }
            }
        }
    }

}

// Initialize history dropdown functionality
const systemInitHistoryDropdown = () => {
    const historyButton = document.getElementById('history-dropdown-button');
    const historyDropdown = document.getElementById('history-dropdown');

    if (!historyButton || !historyDropdown) return;

    // Toggle history dropdown on click
    historyButton.addEventListener('click', function(e) {
        e.stopPropagation();

        // Hide other dropdowns if open
        const userDropdown = document.getElementById('user-dropdown');
        const languageDropdown = document.getElementById('language-dropdown');
        const notificationDropdown = document.getElementById('notification-dropdown');

        if (userDropdown && !userDropdown.classList.contains('hidden')) {
            userDropdown.classList.add('hidden');
        }

        if (languageDropdown && !languageDropdown.classList.contains('hidden')) {
            languageDropdown.classList.add('hidden');
        }

        if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            notificationDropdown.classList.add('hidden');
        }

        // Toggle history dropdown with animation
        historyDropdown.classList.toggle('hidden');
        if (!historyDropdown.classList.contains('hidden')) {
            historyDropdown.classList.add('notification-in');
            setTimeout(() => {
                historyDropdown.classList.remove('notification-in');
            }, 300);
        }
    });
}

document.addEventListener('DOMContentLoaded', systemInitLanguageDropdown);
document.addEventListener('DOMContentLoaded', systemInitUserDropdown);
document.addEventListener('DOMContentLoaded', systemInitNotificationDropdown);
document.addEventListener('DOMContentLoaded', systemInitHistoryDropdown);
