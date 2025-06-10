// Initialize checkbox selection functionality
function initCheckboxSelection() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionButton = document.getElementById('clear-selection');
    const bulkDeleteButton = document.getElementById('bulk-delete');
    const bulkStatusActiveButton = document.getElementById('bulk-status-active');
    const bulkStatusInactiveButton = document.getElementById('bulk-status-inactive');

    // Check if elements exist before adding event listeners
    if (!selectAllCheckbox || !bulkActionsToolbar) return;

    // Remove any existing event listeners to prevent duplicates
    const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);

    // Handle "Select All" checkbox
    newSelectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;

        // Update all visible user checkboxes to match the select all state
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            // Only change checkboxes for visible rows
            if (checkbox.closest('tr').style.display !== 'none') {
                checkbox.checked = isChecked;
            }
        });

        updateBulkActionsToolbar();
    });

    // Handle individual user checkboxes - using event delegation for dynamically created checkboxes
    document.querySelector('table tbody').addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('user-checkbox')) {
            updateSelectAllCheckbox();
            updateBulkActionsToolbar();
        }
    });

    // Handle clear selection button
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', function() {
            document.querySelectorAll('.user-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            newSelectAllCheckbox.checked = false;
            updateBulkActionsToolbar();
        });
    }

    // Set up bulk action buttons
    if (bulkDeleteButton) {
        bulkDeleteButton.addEventListener('click', function() {
            const selectedUserIds = getSelectedUserIds();
            if (selectedUserIds.length > 0) {
                if (confirm(`Are you sure you want to delete ${selectedUserIds.length} selected users?`)) {
                    console.log('Deleting users:', selectedUserIds);
                    // In a real app, you would send an API request to delete the users
                    // For this demo, we'll just show a success message
                    alert(`${selectedUserIds.length} users deleted successfully!`);
                    clearSelectionButton.click();
                }
            }
        });
    }

    if (bulkStatusActiveButton) {
        bulkStatusActiveButton.addEventListener('click', function() {
            const selectedUserIds = getSelectedUserIds();
            if (selectedUserIds.length > 0) {
                console.log('Setting users to active:', selectedUserIds);
                // In a real app, you would send an API request to update the users' status
                alert(`${selectedUserIds.length} users set to active!`);
                // For demo purposes, you could update the UI to show the new status
            }
        });
    }

    if (bulkStatusInactiveButton) {
        bulkStatusInactiveButton.addEventListener('click', function() {
            const selectedUserIds = getSelectedUserIds();
            if (selectedUserIds.length > 0) {
                console.log('Setting users to inactive:', selectedUserIds);
                // In a real app, you would send an API request to update the users' status
                alert(`${selectedUserIds.length} users set to inactive!`);
                // For demo purposes, you could update the UI to show the new status
            }
        });
    }

    // Update the bulk actions toolbar based on selection state
    function updateBulkActionsToolbar() {
        const selectedCount = getSelectedUserIds().length;

        if (selectedCount > 0) {
            bulkActionsToolbar.classList.remove('hidden');
            selectedCountSpan.textContent = `${selectedCount} selected`;
        } else {
            bulkActionsToolbar.classList.add('hidden');
        }
    }

    // Update the "Select All" checkbox based on individual checkboxes
    function updateSelectAllCheckbox() {
        const visibleCheckboxes = Array.from(document.querySelectorAll('.user-checkbox')).filter(checkbox =>
            checkbox.closest('tr').style.display !== 'none'
        );

        const allChecked = visibleCheckboxes.length > 0 &&
                          visibleCheckboxes.every(checkbox => checkbox.checked);

        const someChecked = visibleCheckboxes.some(checkbox => checkbox.checked);

        newSelectAllCheckbox.checked = allChecked;
        newSelectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    // Helper function to get selected user IDs
    function getSelectedUserIds() {
        return Array.from(document.querySelectorAll('.user-checkbox'))
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.userId);
    }

    // Update selection state when filters change
    document.addEventListener('filtersApplied', function() {
        updateSelectAllCheckbox();
        updateBulkActionsToolbar();
    });
}

// Export the init function
window.initCheckboxSelection = initCheckboxSelection;
