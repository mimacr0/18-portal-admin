import { rpc } from "@portal_admin_theme/network/rpc";

// Toggle form loading state
const toggleFormLoading = (isLoading) => {
    const saveButton = document.getElementById('settings-save-button');
    const saveText = document.getElementById('settings-save-text');
    const saveLoader = document.getElementById('settings-save-loader');

    if (!saveButton || !saveText || !saveLoader) return;

    if (isLoading) {
        saveButton.disabled = true;
        saveButton.classList.add('opacity-75');
        saveText.textContent = 'Saving...';
        saveLoader.classList.remove('hidden');
    } else {
        saveButton.disabled = false;
        saveButton.classList.remove('opacity-75');
        saveText.textContent = 'Save Changes';
        saveLoader.classList.add('hidden');
    }
};

// Save user settings
const saveUserSettings = async () => {
    try {
        // Start loading state
        toggleFormLoading(true);

        // Collect settings data
        const settings = {
            list_limit: parseInt(document.getElementById('settings-user-list-limit').value) || 100
        };

        // Submit data
        const response = await rpc('/account/user/update/settings', {
            settings: settings
        });

        systemShowNotification(response.message, {
            type: response.status === 'success' ? 'success' : 'error',
            duration: 3000
        });

        if (response.status === 'success') {
            // Optionally reload after saving
            // await new Promise(resolve => setTimeout(resolve, 1000));
            // window.location.reload();
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        systemShowNotification('Error updating settings', {
            type: 'error',
            duration: 3000
        });
    } finally {
        toggleFormLoading(false);
    }
};

// Load user settings
const loadUserSettings = async () => {
    try {
        const response = await rpc('/account/user/get/settings', {});

        if (response.status === 'success' && response.settings) {
            // Apply settings to form
            if (response.settings.list_limit) {
                document.getElementById('settings-user-list-limit').value = response.settings.list_limit;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the settings page
    const settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) return;

    // Load saved settings
    loadUserSettings();

    // Set up save button
    const saveButton = document.getElementById('settings-save-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveUserSettings);
    }
});
