// Add these global variables at the beginning of the file (before any functions)
window.filteredUsers = []; // Make it a global window property
let sortConfig = {
    column: null,
    direction: 'asc'
};

// Move these to the global scope (outside any function)
// Define these field type definitions globally
const fieldTypes = {
    'name': { type: 'text', operators: ['equals', 'contains', 'not_equals', 'starts_with', 'ends_with'] },
    'email': { type: 'text', operators: ['equals', 'contains', 'not_equals', 'starts_with', 'ends_with'] },
    'role': {
        type: 'select',
        operators: ['equals', 'not_equals'],
        values: ['admin', 'manager', 'editor', 'user']
    },
    'status': {
        type: 'select',
        operators: ['equals', 'not_equals'],
        values: ['active', 'inactive', 'suspended']
    },
    'registered': {
        type: 'date',
        operators: ['greater_than', 'less_than', 'between']
    },
    'last_login': {
        type: 'date',
        operators: ['greater_than', 'less_than', 'between']
    }
};

// Operator display names - move to global scope
const operatorLabels = {
    'equals': 'equals',
    'not_equals': 'not equals',
    'contains': 'contains',
    'starts_with': 'starts with',
    'ends_with': 'ends with',
    'greater_than': 'greater than',
    'less_than': 'before than',
    'between': 'between'
};

// Need to reference these globally
let matchAllBtn;
let matchAnyBtn;
let currentMatchType = 'all'; // Default to 'all'

// Move these functions to global scope so they can be called from anywhere
// Function to update operators based on selected field
function updateOperators(filterLine, field) {
    const operatorContainer = filterLine.querySelector('.operator-container');
    const operatorSelect = filterLine.querySelector('.filter-operator');

    if (operatorContainer && field in fieldTypes) {
        const newOperatorSelect = document.createElement('select');
        newOperatorSelect.className = operatorSelect.className;
        newOperatorSelect.classList.add('filter-operator');
        newOperatorSelect.innerHTML = generateOperatorOptions(field);

        operatorSelect.replaceWith(newOperatorSelect);

        // Update value input for the new field
        updateValueInput(filterLine, field, newOperatorSelect.value);

        // Add event listener to the new operator select
        newOperatorSelect.addEventListener('change', function() {
            updateValueInput(filterLine, field, this.value);
        });
    }
}

// Function to update value input based on selected field and operator
function updateValueInput(filterLine, field, operator) {
    const valueContainer = filterLine.querySelector('.value-container');

    if (valueContainer && field in fieldTypes) {
        // Generate the HTML for the input
        valueContainer.innerHTML = `
            <label class="block text-xs font-medium text-gray-700 mb-1">Value</label>
            ${generateValueInput(field, operator)}
        `;

        // Initialize datepickers for newly created inputs
        setTimeout(() => {
            if (typeof window.initializeDatepickers === 'function') {
                window.initializeDatepickers(filterLine);
            }
        }, 10);
    }
}

// Function to generate operator options based on field type
function generateOperatorOptions(field) {
    const fieldConfig = fieldTypes[field];
    let options = '';

    fieldConfig.operators.forEach(op => {
        options += `<option value="${op}">${operatorLabels[op]}</option>`;
    });

    return options;
}

// Function to generate value input based on field type and operator
function generateValueInput(field, operator) {
    const fieldConfig = fieldTypes[field];

    switch(fieldConfig.type) {
        case 'text':
            return `<input type="text" class="filter-value w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" placeholder="Enter value..." required>`;

        case 'select':
            let options = fieldConfig.values.map(value =>
                `<option value="${value}">${value.charAt(0).toUpperCase() + value.slice(1)}</option>`
            ).join('');

            return `<select class="filter-value w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" required>
                ${options}
            </select>`;

        case 'date':
            if (operator === 'between') {
                return `<div class="flex items-center space-x-2">
                    <input type="date" class="filter-value filter-value-from datepicker w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" required>
                    <span class="text-xs font-medium text-gray-500">and</span>
                    <input type="date" class="filter-value filter-value-to datepicker w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" required>
                </div>`;
            } else {
                return `<input type="date" class="filter-value datepicker w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" required>`;
            }

        default:
            return `<input type="text" class="filter-value w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" placeholder="Enter value..." required>`;
    }
}

// Function to reset a filter line to default values
function resetFilterLine(filterLine) {
    const fieldSelect = filterLine.querySelector('.filter-field');
    if (fieldSelect) {
        fieldSelect.value = 'name';
        updateOperators(filterLine, 'name');
    }
}

// Function to initialize event listeners for a filter line
function initializeFilterLine(filterLine) {
    const fieldSelect = filterLine.querySelector('.filter-field');
    const operatorContainer = filterLine.querySelector('.operator-container');
    const valueContainer = filterLine.querySelector('.value-container');
    const removeButton = filterLine.querySelector('.remove-filter');

    // Handle field change
    if (fieldSelect) {
        fieldSelect.addEventListener('change', function() {
            updateOperators(filterLine, this.value);
        });
    }

    // Handle operator change
    const operatorSelect = filterLine.querySelector('.filter-operator');
    if (operatorSelect) {
        operatorSelect.addEventListener('change', function() {
            updateValueInput(filterLine, fieldSelect.value, this.value);
        });
    }

    // Handle remove button - prevent event bubbling
    if (removeButton) {
        removeButton.addEventListener('click', function(e) {
            // Stop event from bubbling up to document
            e.stopPropagation();

            const filterLines = document.getElementById('filter-lines');
            if (filterLines && filterLines.children.length > 1) {
                filterLine.remove();
            } else {
                // If it's the last filter line, just reset it instead of removing
                resetFilterLine(filterLine);
            }
        });
    }

    // Initialize datepickers for date fields
    if (typeof window.initializeDatepickers === 'function') {
        window.initializeDatepickers(filterLine);
    }
}

// Function to initialize filter lines
function initializeFilterLines() {
    const filterLines = document.querySelectorAll('.filter-line');

    filterLines.forEach(line => {
        // Get the current field value
        const fieldSelect = line.querySelector('.filter-field');
        if (fieldSelect) {
            const currentField = fieldSelect.value;

            // First update the operators to match the selected field type
            updateOperators(line, currentField);

            // Then initialize other event listeners
            initializeFilterLine(line);
        }
    });
}

// Function to add a new filter line
function addNewFilterLine() {
    const filterLinesContainer = document.getElementById('filter-lines');

    if (filterLinesContainer) {
        // Create a new filter line element
        const newFilterLine = document.createElement('div');
        newFilterLine.className = 'filter-line flex flex-wrap md:flex-nowrap items-end gap-2';

        // Default field type is 'name'
        const defaultField = 'name';

        newFilterLine.innerHTML = `
            <!-- Field Selection -->
            <div class="w-full md:w-1/4">
                <label class="block text-xs font-medium text-gray-700 mb-1">Field</label>
                <select class="filter-field w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    <option value="name" selected>Name</option>
                    <option value="email">Email</option>
                    <option value="role">Role</option>
                    <option value="status">Status</option>
                    <option value="registered">Registration Date</option>
                    <option value="last_login">Last Login</option>
                </select>
            </div>

            <!-- Operator Selection -->
            <div class="operator-container w-full md:w-1/4">
                <label class="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                <select class="filter-operator w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    ${generateOperatorOptions(defaultField)}
                </select>
            </div>

            <!-- Value Input -->
            <div class="value-container w-full md:w-1/3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Value</label>
                ${generateValueInput(defaultField, 'equals')}
            </div>

            <!-- Remove Line Button -->
            <div class="flex items-center mt-1 md:mt-0">
                <button class="remove-filter p-1.5 text-gray-400 hover:text-red-500" title="Remove condition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add the new filter line to the container
        filterLinesContainer.appendChild(newFilterLine);

        // Initialize the new filter line
        initializeFilterLine(newFilterLine);

        // Prevent the document click handler from running
        setTimeout(() => {
            filterLinesContainer.click();
        }, 0);
    }
}

// Function to reset all filters
function resetAllFilters() {
    // Reset to default match type (all)
    currentMatchType = 'all';
    if (matchAllBtn && matchAnyBtn) {
        setMatchType('all');
    }

    // Remove all filter lines except the first one
    const filterLinesContainer = document.getElementById('filter-lines');
    if (filterLinesContainer) {
        const filterLines = filterLinesContainer.querySelectorAll('.filter-line');

        // Keep the first filter line and reset it
        if (filterLines.length > 0) {
            resetFilterLine(filterLines[0]);

            // Remove all other filter lines
            for (let i = 1; i < filterLines.length; i++) {
                filterLines[i].remove();
            }
        } else {
            // If no filter lines exist, add a default one
            addNewFilterLine();
        }
    }
}

// Helper function to set match type (all/any)
function setMatchType(type) {
    currentMatchType = type;

    if (type === 'all') {
        matchAllBtn.classList.add('bg-cyan-600', 'text-white');
        matchAllBtn.classList.remove('bg-gray-50', 'text-gray-700');

        matchAnyBtn.classList.add('bg-gray-50', 'text-gray-700');
        matchAnyBtn.classList.remove('bg-cyan-600', 'text-white');
    } else {
        matchAnyBtn.classList.add('bg-cyan-600', 'text-white');
        matchAnyBtn.classList.remove('bg-gray-50', 'text-gray-700');

        matchAllBtn.classList.add('bg-gray-50', 'text-gray-700');
        matchAllBtn.classList.remove('bg-cyan-600', 'text-white');
    }
}

// User page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Make sure pagination state is initialized first
    if (typeof window.paginationState === 'undefined') {
        window.paginationState = {
            currentPage: 1,
            itemsPerPage: 5, // Show 5 items per page
            totalItems: 0,
            totalPages: 0
        };
    }

    // First load user data
    loadUserData();

    // Then initialize components after data is loaded
    if (typeof initUserModal === 'function') initUserModal();
    initTableSorting();
    if (typeof initFilters === 'function') initFilters();
    if (typeof initMobileFilters === 'function') initMobileFilters();
    if (typeof initCheckboxSelection === 'function') initCheckboxSelection();
    initAdvancedSearch();
    if (typeof initPagination === 'function') initPagination();

    // Initialize form button - now provided by forms.js
    if (typeof window.initLaunchFormButton === 'function') window.initLaunchFormButton();

    // Initialize clipboard functionality
    if (typeof initClipboardFields === 'function') initClipboardFields();

    // Initialize tooltips for dynamically created elements
    initTooltips();

    // Force pagination styling
    if (typeof window.forcePaginationStyle === 'function') {
        window.forcePaginationStyle();
    }

    // Initialize datepickers (now from forms.js)
    if (typeof window.reinitializeAllDatepickers === 'function') {
        setTimeout(window.reinitializeAllDatepickers, 500);
    }

    // Also reinitialize when the advanced search toggle is clicked
    const advancedSearchToggle = document.getElementById('advanced-search-toggle');
    if (advancedSearchToggle) {
        advancedSearchToggle.addEventListener('click', function() {
            // Short delay to allow panel to become visible
            if (typeof window.reinitializeAllDatepickers === 'function') {
                setTimeout(window.reinitializeAllDatepickers, 300);
            }
        });
    }

    // Additional initialization for the second filter line that's defined in HTML
    setTimeout(() => {
        const filterLines = document.querySelectorAll('.filter-line');
        if (filterLines.length >= 2) {
            const secondLine = filterLines[1];
            const fieldSelect = secondLine.querySelector('.filter-field');

            // If the second line has "registered" field selected, ensure it has the right operators
            if (fieldSelect && fieldSelect.value === 'registered') {
                updateOperators(secondLine, 'registered');

                // Also initialize the date picker
                const valueContainer = secondLine.querySelector('.value-container');
                if (valueContainer) {
                    // Get the current operator
                    const operatorSelect = secondLine.querySelector('.filter-operator');
                    const currentOperator = operatorSelect ? operatorSelect.value : 'greater_than';

                    // Update the value input to match the date field and operator
                    updateValueInput(secondLine, 'registered', currentOperator);
                }
            }
        }
    }, 100);

    // Add these to the bottom of the DOMContentLoaded function
    window.addNewFilterLine = addNewFilterLine;
    window.initializeFilterLine = initializeFilterLine;
});

// Note: Form-related functions have been moved to forms.js
// initLaunchFormButton, initializeModalFormFields, initializeDragDropArea,
// formatFileSize, setupSaveButtonEvents, triggerConfetti,
// initializeDatepickers, and reinitializeAllDatepickers are now available globally

// Initialize advanced search functionality
function initAdvancedSearch() {
    const advancedSearchToggle = document.getElementById('advanced-search-toggle');
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    const applyAdvancedSearchButton = document.getElementById('apply-advanced-search');
    const resetAdvancedSearchButton = document.getElementById('reset-advanced-search');

    // Exit if elements don't exist
    if (!advancedSearchToggle || !advancedSearchPanel) return;

    // Toggle advanced search panel
    advancedSearchToggle.addEventListener('click', function() {
        const isHidden = advancedSearchPanel.classList.contains('hidden');

        // Toggle panel with animation
        if (isHidden) {
            advancedSearchPanel.classList.remove('hidden');
            advancedSearchPanel.style.maxHeight = '0';
            advancedSearchPanel.style.opacity = '0';
            advancedSearchPanel.style.overflow = 'hidden';
            advancedSearchPanel.style.transition = 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out';

            // Use setTimeout to ensure the transition works properly
            setTimeout(() => {
                advancedSearchPanel.style.maxHeight = advancedSearchPanel.scrollHeight + 'px';
                advancedSearchPanel.style.opacity = '1';
            }, 10);

            setTimeout(() => {
                advancedSearchPanel.style.overflow = 'visible';
                advancedSearchPanel.style.maxHeight = 'none';
            }, 300);

            // Update toggle button appearance
            advancedSearchToggle.classList.add('bg-gray-100');
            advancedSearchToggle.classList.add('text-cyan-600');
        } else {
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

    // Set references to the match type buttons
    matchAllBtn = document.getElementById('match-all');
    matchAnyBtn = document.getElementById('match-any');

    // Add null checks before using the buttons
    if (matchAllBtn && matchAnyBtn) {
        matchAllBtn.addEventListener('click', function() {
            setMatchType('all');
        });

        matchAnyBtn.addEventListener('click', function() {
            setMatchType('any');
        });
    }

    // Initialize all existing filter lines
    initializeFilterLines();

    // Add new filter line button event listener
    const addFilterLineBtn = document.getElementById('add-filter-line');
    if (addFilterLineBtn) {
        addFilterLineBtn.addEventListener('click', function(e) {
            // Stop event from bubbling up
            e.stopPropagation();
            addNewFilterLine();
        });
    }

    // Reset filters button event listener
    if (resetAdvancedSearchButton) {
        resetAdvancedSearchButton.addEventListener('click', function() {
            resetAllFilters();
        });
    }

    // Apply filters with validation
    if (applyAdvancedSearchButton) {
        applyAdvancedSearchButton.addEventListener('click', function() {
            // Apply filters to the actual data
            applyFiltersAndSort();

            // Only hide the panel if filters were successfully applied
            // (The panel will remain open if there are validation errors)
            if (!document.querySelector('#advanced-search-panel .border-red-500')) {
                // Hide the advanced search panel with animation
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

    // Mobile filter button toggle
    const mobileFilterBtn = document.getElementById('mobile-filter-button');
    if (mobileFilterBtn && advancedSearchPanel) {
        mobileFilterBtn.addEventListener('click', function() {
            // Toggle the same way as the advanced search toggle
            const isHidden = advancedSearchPanel.classList.contains('hidden');

            if (isHidden) {
                advancedSearchToggle.click(); // Use the existing toggle function
            } else {
                advancedSearchToggle.click();
            }
        });
    }

    // Initial setup on page load
    // If no filter lines exist, add a default one
    const filterLinesContainer = document.getElementById('filter-lines');
    if (filterLinesContainer && filterLinesContainer.children.length === 0) {
        addNewFilterLine();
    }

    // Also modify document click handler to be more specific
    document.addEventListener('click', function(e) {
        if (advancedSearchPanel &&
            !advancedSearchPanel.classList.contains('hidden') &&
            !advancedSearchPanel.contains(e.target) &&
            e.target !== advancedSearchToggle &&
            !advancedSearchToggle.contains(e.target)) {

            // Only close if we're clicking outside the panel and not on a filter line removal button
            if (!e.target.closest('.remove-filter')) {
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
        }
    });
}

// Initialize table sorting functionality
function initTableSorting() {
    const sortButtons = document.querySelectorAll('th .fas.fa-sort');

    sortButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const column = e.target.closest('th');
            const columnIndex = Array.from(column.parentNode.children).indexOf(column);
            const columnName = getColumnNameByIndex(columnIndex);

            // Reset all sort icons
            sortButtons.forEach(btn => {
                btn.classList.remove('fa-sort-up', 'fa-sort-down');
                btn.classList.add('fa-sort');
            });

            // Toggle sort direction
            if (sortConfig.column === columnName && sortConfig.direction === 'asc') {
                sortConfig.direction = 'desc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-down');
            } else if (sortConfig.column === columnName && sortConfig.direction === 'desc') {
                sortConfig.column = null;
                sortConfig.direction = 'asc';
            } else {
                sortConfig.column = columnName;
                sortConfig.direction = 'asc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-up');
            }

            // Apply new sorting
            applyFiltersAndSort();
        });
    });
}

// Helper function to get column name by index
function getColumnNameByIndex(index) {
    // Adjust indices to account for checkbox column
    switch(index) {
        case 1: return 'name';
        case 2: return 'email';
        case 3: return 'role';
        case 4: return 'status';
        case 5: return 'lastActive';
        default: return null;
    }
}


// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();

    // Re-initialize tooltips on window resize
    window.addEventListener('resize', function() {
        initTooltips();
    });
});

function initTooltips() {
    // Find all elements with data-tooltip-target attribute
    const triggers = document.querySelectorAll('[data-tooltip-target]');

    triggers.forEach(trigger => {
        const tooltipId = trigger.getAttribute('data-tooltip-target');
        const tooltip = document.querySelector(`[data-tooltip="${tooltipId}"]`);

        if (!tooltip) return;

        // Set up event listeners
        trigger.addEventListener('mouseenter', function() {
            showTooltip(trigger, tooltip);
        });

        trigger.addEventListener('mouseleave', function() {
            hideTooltip(tooltip);
        });

        trigger.addEventListener('focus', function() {
            showTooltip(trigger, tooltip);
        });

        trigger.addEventListener('blur', function() {
            hideTooltip(tooltip);
        });
    });
}

function showTooltip(trigger, tooltip) {
    // Get placement from data attribute, default to 'top'
    const placement = tooltip.getAttribute('data-tooltip-placement') || 'top';

    // First display the tooltip to be able to calculate its dimensions
    tooltip.style.display = 'block';
    tooltip.style.opacity = '0';

    // Get dimensions and positions
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Calculate positions based on placement
    let top, left;

    switch (placement) {
        case 'top':
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
        case 'top-start':
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left;
            break;
        case 'top-end':
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.right - tooltipRect.width;
            break;
        case 'right':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.right + 8;
            break;
        case 'right-start':
            top = triggerRect.top;
            left = triggerRect.right + 8;
            break;
        case 'right-end':
            top = triggerRect.bottom - tooltipRect.height;
            left = triggerRect.right + 8;
            break;
        case 'bottom':
            top = triggerRect.bottom + 8;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
        case 'bottom-start':
            top = triggerRect.bottom + 8;
            left = triggerRect.left;
            break;
        case 'bottom-end':
            top = triggerRect.bottom + 8;
            left = triggerRect.right - tooltipRect.width;
            break;
        case 'left':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
        case 'left-start':
            top = triggerRect.top;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
        case 'left-end':
            top = triggerRect.bottom - tooltipRect.height;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
        default:
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    }

    // Adjust position to keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Keep tooltip within horizontal bounds
    if (left < 8) {
        left = 8;
    } else if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
    }

    // Keep tooltip within vertical bounds
    if (top < 8) {
        // If tooltip is placed on top and would overflow, flip to bottom
        if (placement.startsWith('top')) {
            top = triggerRect.bottom + 8;
        } else {
            top = 8;
        }
    } else if (top + tooltipRect.height > viewportHeight - 8) {
        // If tooltip is placed on bottom and would overflow, flip to top
        if (placement.startsWith('bottom')) {
            top = triggerRect.top - tooltipRect.height - 8;
        } else {
            top = viewportHeight - tooltipRect.height - 8;
        }
    }

    // Set the tooltip position
    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;

    // Make tooltip visible with fade-in effect
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s ease-in-out';

    // Use setTimeout to ensure the transition applies
    setTimeout(() => {
        tooltip.style.opacity = '1';
    }, 10);
}

function hideTooltip(tooltip) {
    // Hide tooltip with fade-out effect
    tooltip.style.opacity = '0';

    // Use setTimeout to match the transition duration
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 200);
}

// Make sure to expose key functions to the window object
window.initTableSorting = initTableSorting;
window.initAdvancedSearch = initAdvancedSearch;
window.initTooltips = initTooltips;

// Function to load user data from data.js
function loadUserData() {
    if (typeof usersList === 'undefined' || !usersList || usersList.length === 0) {
        console.error('usersList is empty or not defined. Make sure data.js is loaded properly.');
        return;
    }

    // Initialize filteredUsers with all users (as a global variable)
    window.filteredUsers = [...usersList];

    // Update the pagination with the full count immediately
    if (window.updatePaginationSummary) {
        window.updatePaginationSummary(usersList.length);
    }

    // Apply initial filters and render
    applyFiltersAndSort();
}

// New function to apply filters, sort, and then render
function applyFiltersAndSort(skipPagination = false) {
    // First filter the data
    filterUsers();

    // Then sort the filtered data
    sortUsers();

    // Update pagination with new filtered count
    if (window.updatePaginationSummary) {
        window.updatePaginationSummary(filteredUsers.length);
    }

    // Render the data
    renderUsers();

    // Call pagination, but only if not skipping (to avoid infinite loop)
    if (!skipPagination && window.applyPagination) {
        window.applyPagination(true); // Skip filtering when called from here
    }

    // Dispatch event that filters were applied
    document.dispatchEvent(new CustomEvent('filtersApplied'));
}

// Update the filterUsers function to incorporate advanced search filters
function filterUsers() {
    window.filteredUsers = [...usersList]; // Start with all users

    // Get basic filter values
    const roleFilter = document.getElementById('role-filter')?.value ||
                      document.getElementById('mobile-role-filter')?.value || '';

    const statusFilter = document.getElementById('status-filter')?.value ||
                        document.getElementById('mobile-status-filter')?.value || '';

    const dateFilter = document.getElementById('date-filter')?.value ||
                      document.getElementById('mobile-date-filter')?.value || '';

    const searchTerm = document.getElementById('search')?.value.toLowerCase() || '';

    // Apply role filter
    if (roleFilter) {
        window.filteredUsers = window.filteredUsers.filter(user =>
            user.role.toLowerCase() === roleFilter.toLowerCase()
        );
    }

    // Apply status filter
    if (statusFilter) {
        window.filteredUsers = window.filteredUsers.filter(user =>
            user.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }

    // Apply search filter
    if (searchTerm) {
        window.filteredUsers = window.filteredUsers.filter(user =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    // Apply advanced search filters
    applyAdvancedFilters();
}

// Update the applyAdvancedFilters function with better validation
function applyAdvancedFilters() {
    // Get advanced search panel to check if it's visible
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    if (!advancedSearchPanel || advancedSearchPanel.classList.contains('hidden')) {
        return; // Skip if advanced search panel is not visible
    }

    // Get all filter lines
    const filterLines = document.querySelectorAll('.filter-line');
    if (!filterLines.length) return;

    // Validate all inputs before proceeding
    let allValid = true;
    let firstInvalidInput = null;

    // Check each filter line individually
    filterLines.forEach(line => {
        // Get all input elements in this filter line
        const inputs = line.querySelectorAll('input, select');

        inputs.forEach(input => {
            // Remove any previous error styling
            input.classList.remove('border-red-500');

            // Check validity using the browser's built-in validation
            const isValid = input.checkValidity();

            if (!isValid) {
                allValid = false;
                input.classList.add('border-red-500');

                // Store the first invalid input to focus on it later
                if (!firstInvalidInput) {
                    firstInvalidInput = input;
                }

                // Add change/input handler to remove error styling when fixed
                const eventType = input.type === 'date' ? 'change' : 'input';
                input.addEventListener(eventType, function() {
                    if (this.checkValidity()) {
                        this.classList.remove('border-red-500');
                    }
                }, { once: true });
            }

            // Additional check for empty values that might pass HTML5 validation
            if (input.hasAttribute('required') &&
                (input.value === '' || input.value === null || input.value === undefined)) {
                allValid = false;
                input.classList.add('border-red-500');

                if (!firstInvalidInput) {
                    firstInvalidInput = input;
                }
            }

            // Special case for date inputs in between operator
            if (input.classList.contains('filter-value-from') ||
                input.classList.contains('filter-value-to')) {
                // Get the parent filter line
                const parentLine = input.closest('.filter-line');
                const operatorSelect = parentLine?.querySelector('.filter-operator');

                if (operatorSelect && operatorSelect.value === 'between') {
                    // Both from and to dates are required for between operator
                    if (input.value === '') {
                        allValid = false;
                        input.classList.add('border-red-500');

                        if (!firstInvalidInput) {
                            firstInvalidInput = input;
                        }
                    }
                }
            }
        });
    });

    // If validation failed, focus on the first invalid input and exit
    if (!allValid && firstInvalidInput) {
        firstInvalidInput.focus();

        // Show a validation message to the user
        if (typeof showNotification === 'function') {
            showNotification('Please fill in all required fields correctly', 'error');
        } else {
            // Fallback if notification function isn't available
            alert('Please fill in all required fields correctly');
        }

        return;
    }

    // Continue with filtering logic since all inputs are valid...
    const matchType = document.getElementById('match-type')?.value || 'all';
    const requireAll = matchType === 'all';

    // Process each user against the filters
    window.filteredUsers = window.filteredUsers.filter(user => {
        let matches = 0;
        let conditions = 0;

        filterLines.forEach(line => {
            const field = line.querySelector('.filter-field')?.value;
            const operator = line.querySelector('.filter-operator')?.value;
            const valueElement = line.querySelector('.filter-value');

            if (!field || !operator || !valueElement) return;

            let value = valueElement.value;
            let userValue = user[field];

            if (!userValue && field === 'last_login') {
                userValue = user.lastActive; // Map field to the actual property name
            }

            // Skip empty filters
            if (!value) return;

            conditions++;

            // Special handling for between operator with date ranges
            if (operator === 'between') {
                const fromValue = line.querySelector('.filter-value-from')?.value;
                const toValue = line.querySelector('.filter-value-to')?.value;

                if (fromValue && toValue) {
                    const condition = userValue >= fromValue && userValue <= toValue;
                    if (condition) matches++;
                }

                return; // Skip the rest of the processing for this line
            }

            // Convert values to lowercase for string comparisons
            if (typeof userValue === 'string') {
                userValue = userValue.toLowerCase();
            }
            if (typeof value === 'string') {
                value = value.toLowerCase();
            }

            // Apply the filter based on operator
            let condition = false;
            switch(operator) {
                case 'equals':
                    condition = userValue === value;
                    break;
                case 'not_equals':
                    condition = userValue !== value;
                    break;
                case 'contains':
                    condition = userValue?.includes(value);
                    break;
                case 'starts_with':
                    condition = userValue?.startsWith(value);
                    break;
                case 'ends_with':
                    condition = userValue?.endsWith(value);
                    break;
                case 'greater_than':
                    condition = userValue > value;
                    break;
                case 'less_than':
                    condition = userValue < value;
                    break;
                default:
                    condition = false;
            }

            if (condition) matches++;
        });

        // Return true if all conditions match (AND) or any condition matches (OR)
        return conditions === 0 ||
               (requireAll ? matches === conditions : matches > 0);
    });
}

// Sort users based on current sort config
function sortUsers() {
    if (!sortConfig.column) return; // No sorting needed

    filteredUsers.sort((a, b) => {
        let valueA = a[sortConfig.column];
        let valueB = b[sortConfig.column];

        // Handle special sorting cases
        if (sortConfig.column === 'lastActive') {
            // Try to sort by recency - this is imperfect since lastActive is a string
            // In a real app, you'd have actual timestamps
            return sortByLastActive(valueA, valueB);
        }

        // Default string comparison
        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();

        if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Helper to sort by lastActive strings like "Just now", "3 hours ago"
function sortByLastActive(a, b) {
    // This is a simplified version - a real implementation would be more sophisticated
    const timeMap = {
        'Just now': 0,
        'minute': 1,
        'hour': 2,
        'day': 3,
        'week': 4,
        'month': 5,
        'year': 6
    };

    // Find the closest match in timeMap
    let scoreA = 9999;
    let scoreB = 9999;

    for (const [key, value] of Object.entries(timeMap)) {
        if (a.includes(key) && value < scoreA) scoreA = value;
        if (b.includes(key) && value < scoreB) scoreB = value;
    }

    return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
}

// Render the current page of users
function renderUsers() {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = '';

    // Get current page bounds
    const startIndex = (window.paginationState.currentPage - 1) * window.paginationState.itemsPerPage;
    const endIndex = Math.min(startIndex + window.paginationState.itemsPerPage, filteredUsers.length);

    // Role class mapping
    const roleClasses = {
        'admin': 'bg-blue-100 text-blue-800',
        'manager': 'bg-purple-100 text-purple-800',
        'editor': 'bg-indigo-100 text-indigo-800',
        'user': 'bg-gray-100 text-gray-800'
    };

    // Status class mapping
    const statusClasses = {
        'active': 'bg-green-100 text-green-800',
        'inactive': 'bg-yellow-100 text-yellow-800',
        'suspended': 'bg-red-100 text-red-800'
    };

    // Generate rows for current page
    for (let i = startIndex; i < endIndex; i++) {
        const user = filteredUsers[i];

        const rowLG = document.createElement('tr');
        rowLG.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 hidden lg:table-row';
        rowLG.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                <input type="checkbox" class="user-checkbox h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" data-user-id="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <img class="size-10 rounded-full" src="${user.image}" alt="${user.name}">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${user.name}</div>
                        <div class="text-sm text-gray-500">ID: #${user.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-gray-100">${user.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClasses[user.role] || ''}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[user.status] || ''}">
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-100">
                ${user.lastActive}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-tooltip-target="tooltip-edit-${user.id}" class="text-gray-600 hover:text-gray-900 mr-3 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-tooltip-target="tooltip-delete-${user.id}" class="text-gray-600 hover:text-gray-900 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        const rowMD = document.createElement('tr');
        rowMD.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 hidden md:table-row lg:hidden';
        rowMD.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                <input type="checkbox" class="user-checkbox h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" data-user-id="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-gray-100">${user.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[user.status] || ''}">
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-tooltip-target="tooltip-edit-${user.id}" class="text-gray-600 hover:text-gray-900 mr-3 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-tooltip-target="tooltip-delete-${user.id}" class="text-gray-600 hover:text-gray-900 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        const rowSM = document.createElement('tr');
        rowSM.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 table-row md:hidden';
        rowSM.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                <input type="checkbox" class="user-checkbox h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" data-user-id="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-gray-100">${user.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-tooltip-target="tooltip-edit-${user.id}" class="text-gray-600 hover:text-gray-900 mr-3 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-tooltip-target="tooltip-delete-${user.id}" class="text-gray-600 hover:text-gray-900 relative dark:text-gray-100 dark:hover:text-gray-100">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(rowLG);
        tableBody.appendChild(rowMD);
        tableBody.appendChild(rowSM);
    }

    // Re-initialize tooltips and checkboxes for new elements
    if (typeof initTooltips === 'function') initTooltips();
    if (typeof initCheckboxSelection === 'function') initCheckboxSelection();
}

// Expose these functions to the global scope
window.updateOperators = updateOperators;
window.updateValueInput = updateValueInput;
window.generateOperatorOptions = generateOperatorOptions;
window.generateValueInput = generateValueInput;
window.resetAllFilters = resetAllFilters;
window.resetFilterLine = resetFilterLine;
window.setMatchType = setMatchType;

// Replace the initializeDatepickers function with this simplified version
function initializeDatepickers(filterLine) {
    // First convert any date inputs to proper type="date" inputs
    const dateInputs = filterLine.querySelectorAll('.datepicker');

    dateInputs.forEach(input => {
        // Make sure the input is set to type="date"
        input.type = "date";

        // Add styling and attributes for better UX
        input.style.cursor = 'pointer';
        input.classList.add('date-input-active');

        // Set min/max dates if not set
        if (!input.getAttribute('min')) {
            input.setAttribute('min', '1970-01-01');
        }

        if (!input.getAttribute('max')) {
            const today = new Date();
            const year = today.getFullYear() + 10; // Allow dates up to 10 years in future
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            input.setAttribute('max', `${year}-${month}-${day}`);
        }

        // Add validation and change handlers
        input.addEventListener('change', function() {
            this.classList.remove('border-red-500');
            // Set value attribute for validation
            if (this.value) {
                this.setAttribute('value', this.value);
            }
        });
    });
}

// Also add a global initialization function for all datepickers to call after document ready
function reinitializeAllDatepickers() {
    // Fix for any datepickers in the advanced search panel
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    if (advancedSearchPanel) {
        const filterLines = advancedSearchPanel.querySelectorAll('.filter-line');
        filterLines.forEach(line => {
            initializeDatepickers(line);
        });
    }
}
