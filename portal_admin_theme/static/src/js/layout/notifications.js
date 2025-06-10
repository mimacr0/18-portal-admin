
// Create or get the notifications container
const getNotificationsContainer = () => {
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'fixed right-4 z-50 flex flex-col gap-3';
        container.style.top = '1rem'; // Start at top
        container.style.width = '320px'; // Fixed width
        document.body.appendChild(container);
    }
    return container;
}

// Show notification - unified function with enhanced options
const systemShowNotification = (message, options = {}) => {
    // Default options
    const defaults = {
        title: null,          // Optional title
        type: 'info',         // Default type: info, success, warning, error
        sticky: false,        // Not sticky by default
        duration: 5000,       // Default duration for non-sticky (5 seconds)
        position: 'right',    // Position: right, left, center
        dismissible: true,    // Allow user to dismiss
        animation: 'slide',   // Animation style: slide, fade, bounce
        customClass: '',      // Additional custom classes
        onOpen: null,         // Callback when notification appears
        onClose: null         // Callback when notification is dismissed
    };

    // Merge defaults with provided options
    const settings = {...defaults, ...options};

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transform translate-x-full transition-all duration-500 ease-out ${settings.customClass}`;
    notification.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#1f2937' : 'white';
    notification.dataset.notificationType = settings.type;
    notification.style.width = '100%';
    notification.style.zIndex = '60'; // Ensure proper stacking

    // Add stronger shadow for sticky notifications
    if (settings.sticky) {
        notification.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    }

    // Set icon based on type
    let iconClass = 'fas fa-info-circle text-cyan-500';
    let borderClass = 'border-l-4 border-cyan-500';

    if (settings.type === 'success') {
        iconClass = 'fas fa-check-circle text-green-500';
        borderClass = 'border-l-4 border-green-500';
    } else if (settings.type === 'warning') {
        iconClass = 'fas fa-exclamation-triangle text-yellow-500';
        borderClass = 'border-l-4 border-yellow-500';
    } else if (settings.type === 'error') {
        iconClass = 'fas fa-times-circle text-red-500';
        borderClass = 'border-l-4 border-red-500';
    }

    notification.classList.add(...borderClass.split(' '));

    // Build title element if provided
    let titleHtml = '';
    if (settings.title) {
        // Remove sticky badge, just show title
        titleHtml = `<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${settings.title}</p>`;
    }

    // Set notification content
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="${iconClass} text-xl ${!settings.sticky ? 'animate-pulse-subtle' : ''}"></i>
            </div>
            <div class="ml-3 flex-1 overflow-hidden">
                ${titleHtml}
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">${message}</p>
            </div>
            ${settings.dismissible ? `
            <div class="ml-4 flex-shrink-0 flex">
                <button class="inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ` : ''}
        </div>
    `;

    // Get container based on position
    const container = getNotificationsContainer(settings.position);
    container.appendChild(notification);

    // Set animation style
    let animationClass = 'translate-x-0';
    if (settings.animation === 'fade') {
        notification.classList.remove('translate-x-full');
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
    } else if (settings.animation === 'bounce') {
        notification.classList.add('bounce-in');
    } else { // slide (default)
        // Add entry animation
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 10);
    }

    // Add dismiss functionality if dismissible
    if (settings.dismissible) {
        const dismissButton = notification.querySelector('button');
        if (dismissButton) {
            dismissButton.addEventListener('click', function() {
                closeNotification();
            });
        }
    }

    // Function to close notification
    function closeNotification() {
        // Animation for closing
        if (settings.animation === 'fade') {
            notification.style.opacity = '0';
        } else {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
        }

        // Add opacity effect for all animation types
        notification.style.opacity = '0';

        // Remove after animation
        setTimeout(() => {
            if (container.contains(notification)) {
                notification.remove();

                // Call onClose callback if provided
                if (typeof settings.onClose === 'function') {
                    settings.onClose();
                }
            }
        }, 500);
    }

    // Auto-dismiss for non-sticky notifications
    if (!settings.sticky) {
        setTimeout(() => {
            if (container.contains(notification)) {
                closeNotification();
            }
        }, settings.duration);
    } else {
        // Add subtle attention-getting animation every 10 seconds for sticky notifications
        const pulseAttention = () => {
            notification.classList.add('animate-pulse-once');
            setTimeout(() => {
                notification.classList.remove('animate-pulse-once');
            }, 1000);
        };

        // Initial pulse after 10 seconds, then repeat
        const pulseTimer = setInterval(pulseAttention, 10000);

        // Clear interval when notification is dismissed
        if (settings.dismissible) {
            const dismissButton = notification.querySelector('button');
            if (dismissButton) {
                dismissButton.addEventListener('click', () => {
                    clearInterval(pulseTimer);
                });
            }
        }
    }

    // Call onOpen callback if provided
    if (typeof settings.onOpen === 'function') {
        settings.onOpen(notification);
    }

    // Return the notification element for potential later reference
    return notification;
}
