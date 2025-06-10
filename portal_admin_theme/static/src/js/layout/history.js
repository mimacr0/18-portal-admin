const HISTORY_MAX_WIDGET_ITEMS = 5; // Show fewer items in the widget

// Move loadHistory and saveHistory to global scope
const sysLayoutHistoryLoadHistory = () => {
    const pageStorageUid = document.getElementById('page-storage-uid')?.value;
    const pageStorageHistoryUID = `page-storage-history-${pageStorageUid}`;
    const historyData = localStorage.getItem(pageStorageHistoryUID);
    const history = historyData ? JSON.parse(historyData) : [];
    return history;
};

const sysLayoutHistorySaveHistory = (history) => {
    const pageStorageUid = document.getElementById('page-storage-uid')?.value;
    const pageStorageHistoryUID = `page-storage-history-${pageStorageUid}`;
    localStorage.setItem(pageStorageHistoryUID, JSON.stringify(history));
};

const sysLayoutBuildDesktopHistoryItem = (item) => {
    const historyItem = document.createElement('a');
    historyItem.href = item.path;

    // Use the active property from the item
    const activeClass = item.active ? 'bg-cyan-600 text-gray-900 text-white hover:bg-cyan-700 hover:text-gray-100 dark:hover:bg-cyan-700 dark:hover:text-gray-100' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600';
    historyItem.className = `history-widget-item flex items-center text-sm text-gray-600 dark:text-gray-300
        hover:text-cyan-600 dark:hover:text-cyan-400 rounded-md transition-all duration-200
        shadow-sm md:p-0.5 lg:p-1 text-sm ${activeClass} hidden sm:flex`;
    historyItem.setAttribute('data-history-id', item.path);
    historyItem.setAttribute('data-title', item.title);

    historyItem.innerHTML = `
        <i class="fas ${item.icon} w-5 md:mr-0 lg:mr-3 text-center"></i>
        <div class="flex-1 min-w-0 hidden lg:block">
            <p class="truncate">${item.title}</p>
        </div>
    `;

    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'history-item-close w-5 text-center hidden lg:block';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    historyItem.appendChild(closeBtn);

    historyItem.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Set this item as active in history
        const history = sysLayoutHistoryLoadHistory();
        const updatedHistory = history.map(item => ({
            ...item,
            active: item.path === historyItem.getAttribute('data-history-id')
        }));

        sysLayoutHistorySaveHistory(updatedHistory);
        sysLayoutReloadPagesHistory();

        // Navigate to the item path
        window.location.href = item.path;
    });

    historyItem.addEventListener('mouseenter', function(e) {
        e.preventDefault();
        e.stopPropagation();

        historyItem.classList.add('history-widget-item-hover');
    });

    historyItem.addEventListener('mouseleave', function(e) {
        e.preventDefault();
        e.stopPropagation();

        historyItem.classList.remove('history-widget-item-hover');
    });

    return historyItem;
}

const sysLayoutBuildMobileHistoryItem = (item) => {
    const historyItem = document.createElement('a');
    historyItem.href = item.path;
    historyItem.className = 'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
    historyItem.setAttribute('data-history-id', item.path);

    const getTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
        return `${Math.floor(diffSec / 86400)} day ago`;
    };

    // Format date
    const date = new Date(item.timestamp);
    const timeAgo = getTimeAgo(date);

    historyItem.innerHTML = `
        <i class="fas ${item.icon} text-gray-500 dark:text-gray-400 w-5 mr-3 text-center"></i>
        <div class="flex-1 min-w-0">
            <p class="truncate">${item.title}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${timeAgo}</p>
        </div>
    `;

    return historyItem;
}

const sysLayoutReloadPagesHistory = () => {
    // Get a fresh reference to the history widget
    const historyWidget = document.getElementById('history-widget');
    if (!historyWidget) return;

    // Get current page info
    const currentPagePath = window.location.pathname;

    // Load history from localStorage - using the pageStorageHistoryUID instead of 'pageHistory'
    const pageStorageUid = document.getElementById('page-storage-uid')?.value;
    const pageStorageHistoryUID = `page-storage-history-${pageStorageUid}`;
    const history = JSON.parse(localStorage.getItem(pageStorageHistoryUID) || '[]');

    // Only show a subset of history items for the widget
    const widgetHistory = history.slice(0, HISTORY_MAX_WIDGET_ITEMS);

    // Clear the widget first
    historyWidget.innerHTML = '';

    // If no items, exit early with empty state message
    if (widgetHistory.length === 0) {
        const emptyWidget = document.createElement('span');
        emptyWidget.className = 'text-gray-400 dark:text-gray-600 text-sm italic hidden sm:inline-block';
        emptyWidget.textContent = 'No history yet';
        historyWidget.appendChild(emptyWidget);
        return;
    }

    // Create widget items
    let index = 0;
    for (const item of widgetHistory) {
        // Add separator if not first item
        if (index > 0) {
            const divider = document.createElement('span');
            divider.className = 'history-divider text-gray-500 dark:text-gray-400 hidden sm:inline-block md:mx-0.5 lg:mx-2';
            divider.textContent = '/';
            historyWidget.appendChild(divider);
        }

        // Check if this item is active (matches current path)
        const isActive = item.path === currentPagePath;
        historyWidget.appendChild(sysLayoutBuildDesktopHistoryItem(item));
        index++;
    }

    // Add clear all button
    const clearAllBtn = document.createElement('a');
    clearAllBtn.href = '#';
    clearAllBtn.className = 'history-widget-item history-widget-clear-btn text-gray-500 dark:text-gray-400 hidden sm:inline-block';
    clearAllBtn.setAttribute('data-title', 'Clear all history');
    clearAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

    clearAllBtn.addEventListener('click', function(e) {
        e.preventDefault();
        sysLayoutHistorySaveHistory([]);
        sysLayoutReloadPagesHistory();
    });

    historyWidget.appendChild(clearAllBtn);
}

const sysLayoutInitPagesHistory = () => {
    const historyActionElements = document.querySelectorAll('[data-history-url]');
    const pageStorageUid = document.getElementById('page-storage-uid')?.value;
    const pageStorageHistoryUID = `page-storage-history-${pageStorageUid}`;

    if (!historyActionElements) return;

    // DOM Elements
    const historyButton = document.getElementById('history-dropdown-button');
    const historyDropdown = document.getElementById('history-dropdown');
    const historyList = document.getElementById('history-list');
    const historyWidget = document.getElementById('history-widget');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Process history action elements
    for (const historyActionElement of historyActionElements) {
        const historyUrl = historyActionElement.getAttribute('data-history-url');
        const historyTitle = historyActionElement.getAttribute('data-history-title') || 'Untitled Page';
        const historyIcon = historyActionElement.getAttribute('data-history-icon') || 'fa fa-file';

        if (!historyUrl) continue;

        historyActionElement.addEventListener('click', function(e) {
            // Save history but don't stop the event
            const history = sysLayoutHistoryLoadHistory();
            const MAX_HISTORY_ITEMS = 10;

            // Create new history entry with element's attributes and set as active
            const newEntry = {
                path: historyUrl,
                title: historyTitle,
                timestamp: new Date().toISOString(),
                icon: historyIcon,
                active: true
            };

            // Reset active state on all items
            const updatedHistory = history.map(item => ({
                ...item,
                active: false
            }));

            // Remove duplicate if exists
            const filteredHistory = updatedHistory.filter(item => item.path !== historyUrl);

            // Add new entry to the beginning
            filteredHistory.unshift(newEntry);

            // Limit to max items
            const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);

            // Save updated history
            sysLayoutHistorySaveHistory(trimmedHistory);

            // Update UI
            updateHistoryDropdown();
            sysLayoutReloadPagesHistory();
        });
    }

    const updateHistoryDropdown = () => {
        if (!historyList) return;

        // Get current page info
        const currentPagePath = window.location.pathname;

        const history = sysLayoutHistoryLoadHistory();
        historyList.innerHTML = '';

        if (history.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic';
            emptyItem.textContent = 'No history yet';
            historyList.appendChild(emptyItem);
            return;
        }

        for (const item of history) {
            // Skip current page in history dropdown
            if (item.path === currentPagePath) continue;

            historyList.appendChild(sysLayoutBuildMobileHistoryItem(item));
        }
    };

    const clearHistory = () => {
        // Use the correct storage key
        localStorage.removeItem(pageStorageHistoryUID);
        updateHistoryDropdown();
        sysLayoutReloadPagesHistory();

        if (window.showNotification) {
            window.showNotification("History cleared", {
                type: "info",
                duration: 3000
            });
        }
    };

    // Event listeners for clear history button
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearHistory();
        });
    }

    // Handle individual item deletion
    document.addEventListener('click', function(e) {
        if (e.target.closest('.history-item-close')) {
            e.preventDefault();
            e.stopPropagation();

            const historyItem = e.target.closest('.history-widget-item');
            const itemId = historyItem.getAttribute('data-history-id');

            const history = sysLayoutHistoryLoadHistory();
            const updatedHistory = history.filter(item => item.path !== itemId);
            sysLayoutHistorySaveHistory(updatedHistory);

            updateHistoryDropdown();
            sysLayoutReloadPagesHistory();
        }
    });

    // Initial setup
    sysLayoutReloadPagesHistory();
    updateHistoryDropdown();
}

document.addEventListener('DOMContentLoaded', sysLayoutInitPagesHistory);
