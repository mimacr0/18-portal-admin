// Initialize filter functionality
function initFilters() {
    // Desktop filters
    const filters = document.querySelectorAll('#role-filter, #status-filter, #date-filter');
    const searchInput = document.getElementById('search');

    // Mobile filters
    const mobileFilters = document.querySelectorAll('#mobile-role-filter, #mobile-status-filter, #mobile-date-filter');

    // Add event listeners to desktop filters
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            // Sync the mobile version
            const mobileVersion = document.getElementById('mobile-' + filter.id);
            if (mobileVersion) {
                mobileVersion.value = filter.value;
            }
            applyFilters();
        });
    });

    // Add event listeners to mobile filters
    mobileFilters.forEach(filter => {
        filter.addEventListener('change', function() {
            // Sync the desktop version
            const desktopId = filter.id.replace('mobile-', '');
            const desktopVersion = document.getElementById(desktopId);
            if (desktopVersion) {
                desktopVersion.value = filter.value;
            }
            applyFilters();
        });
    });

    // Add event listener to search input with debounce
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(applyFilters, 300);
        });
    }
}

// Initialize mobile filters toggle functionality
function initMobileFilters() {
    // Use advanced-search-toggle for both mobile and desktop
    const advancedSearchToggle = document.getElementById('advanced-search-toggle');
    const advancedSearchPanel = document.getElementById('advanced-search-panel');

    // If the elements don't exist, exit early
    if (!advancedSearchToggle || !advancedSearchPanel) return;

    // Mobile specific tooltip adjustment
    const mobileTooltip = document.querySelector('[data-tooltip="tooltip-advanced-search"]');
    if (mobileTooltip) {
        mobileTooltip.textContent = 'Filters & Advanced Search';
    }

    // Close filters panel when clicking outside
    document.addEventListener('click', function(e) {
        if (advancedSearchPanel &&
            !advancedSearchPanel.classList.contains('hidden') &&
            !advancedSearchPanel.contains(e.target) &&
            e.target !== advancedSearchToggle &&
            !advancedSearchToggle.contains(e.target)) {

            // Hide panel with animation
            advancedSearchPanel.style.maxHeight = advancedSearchPanel.scrollHeight + 'px';
            advancedSearchPanel.style.overflow = 'hidden';

            setTimeout(() => {
                advancedSearchPanel.style.maxHeight = '0';
                advancedSearchPanel.style.opacity = '0';
            }, 10);

            setTimeout(() => {
                advancedSearchPanel.classList.add('hidden');
                advancedSearchPanel.style.maxHeight = '';
                advancedSearchPanel.style.opacity = '';
                advancedSearchPanel.style.overflow = '';
                advancedSearchPanel.style.transition = '';
            }, 300);

            // Update toggle button appearance
            advancedSearchToggle.classList.remove('bg-gray-100');
            advancedSearchToggle.classList.remove('text-cyan-600');
        }
    });
}

// Apply filters function
function applyFilters() {
    // Call the applyFiltersAndSort function in list.js
    if (window.applyFiltersAndSort) {
        window.applyFiltersAndSort();
    }
}

// Get all advanced search filters
function getAdvancedSearchFilters() {
    // Get role checkboxes
    const roleCheckboxes = document.querySelectorAll('.role-checkbox:checked');
    const roles = Array.from(roleCheckboxes).map(checkbox => checkbox.value);

    // Get status checkboxes
    const statusCheckboxes = document.querySelectorAll('.status-checkbox:checked');
    const statuses = Array.from(statusCheckboxes).map(checkbox => checkbox.value);

    // Get date range
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';

    // Get last login
    const lastLogin = document.getElementById('last-login')?.value || '';

    // Get verification status
    const verification = document.getElementById('verification')?.value || '';

    // Get email domain
    const emailDomain = document.getElementById('email-domain')?.value || '';

    return {
        roles,
        statuses,
        dateFrom,
        dateTo,
        lastLogin,
        verification,
        emailDomain
    };
}

// Update active filter indicators
function updateActiveFilterIndicators() {
    // Count active filters for advanced search toggle indicator
    const advancedSearchToggle = document.getElementById('advanced-search-toggle');
    if (advancedSearchToggle) {
        const activeFilters = [
            document.getElementById('role-filter')?.value,
            document.getElementById('status-filter')?.value,
            document.getElementById('date-filter')?.value
        ].filter(Boolean).length;

        // Count advanced search active filters
        const advancedFilters = getAdvancedSearchFilters();
        const activeAdvancedFilters =
            advancedFilters.roles.length +
            advancedFilters.statuses.length +
            (advancedFilters.dateFrom ? 1 : 0) +
            (advancedFilters.dateTo ? 1 : 0) +
            (advancedFilters.lastLogin ? 1 : 0) +
            (advancedFilters.verification ? 1 : 0) +
            (advancedFilters.emailDomain ? 1 : 0);

        const totalActiveFilters = activeFilters + activeAdvancedFilters;

        // Update filter indicator to show count of active filters
        if (totalActiveFilters > 0) {
            let badge = advancedSearchToggle.querySelector('.filter-count');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'filter-count absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center';
                advancedSearchToggle.appendChild(badge);
                advancedSearchToggle.classList.add('relative');
            }
            badge.textContent = totalActiveFilters;
        } else {
            const badge = advancedSearchToggle.querySelector('.filter-count');
            if (badge) {
                badge.remove();
            }
        }
    }
}

// Export the functions
window.initFilters = initFilters;
window.initMobileFilters = initMobileFilters;
window.applyFilters = applyFilters;
window.getAdvancedSearchFilters = getAdvancedSearchFilters;
