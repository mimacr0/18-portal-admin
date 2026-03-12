import { rpc } from "@portal_admin_theme/network/rpc";
import { _t } from "@web/core/l10n/translation";

// Placeholder image for profile
const PLACEHOLDER_IMAGE = '/portal_admin_theme/static/img/placeholder.png';

// Form validation
const validateForm = (form) => {
    let isValid = true;
    const nameInput = document.getElementById('account-user-name');
    const emailInput = document.getElementById('account-user-email');

    // Clear previous error messages
    document.querySelectorAll('.form-error').forEach(el => {
        el.classList.add('invisible');
        el.textContent = '';
    });

    // Validate name
    if (!nameInput.value.trim()) {
        const errorEl = document.getElementById('account-user-name-error');
        errorEl.textContent = _t('Name is required');
        errorEl.classList.remove('invisible');
        isValid = false;
    }

    // Validate email
    if (!emailInput.value.trim()) {
        const errorEl = document.getElementById('account-user-email-error');
        errorEl.textContent = _t('Email is required');
        errorEl.classList.remove('invisible');
        isValid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
        const errorEl = document.getElementById('account-user-email-error');
        errorEl.textContent = _t('Please enter a valid email address');
        errorEl.classList.remove('invisible');
        isValid = false;
    }

    return isValid;
};

// Email validation helper
const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

// Toggle form loading state
const toggleFormLoading = (isLoading) => {
    const submitButton = document.getElementById('account-user-submit');
    const submitText = document.getElementById('account-user-submit-text');
    const submitLoader = document.getElementById('account-user-submit-loader');

    if (!submitButton || !submitText || !submitLoader) return;

    if (isLoading) {
        submitButton.disabled = true;
        submitButton.classList.add('opacity-75');
        submitText.textContent = _t('Saving...');
        submitLoader.classList.remove('hidden');
    } else {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75');
        submitText.textContent = _t('Save Changes');
        submitLoader.classList.add('hidden');
    }
};

// Toggle image upload loading
const toggleImageLoading = (isLoading, imageLabel) => {
    if (!imageLabel) return;

    if (isLoading) {
        imageLabel.classList.add('opacity-75', 'cursor-wait');
        imageLabel.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Uploading...';
    } else {
        imageLabel.classList.remove('opacity-75', 'cursor-wait');
        imageLabel.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload New Photo';
    }
};

// Remove profile image
const removeProfileImage = async (e) => {
    e.preventDefault();

    const imagePreview = document.getElementById('profile-preview');
    const deleteButton = document.getElementById('profile-image-delete');
    const imageLabel = document.getElementById('profile-upload-label');

    if (!imagePreview || !deleteButton) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to remove your profile picture?')) {
        return;
    }

    try {
        // Show loading state
        if (imageLabel) {
            toggleImageLoading(true, imageLabel);
        }
        deleteButton.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i>';
        deleteButton.classList.add('opacity-75', 'cursor-wait');

        // Call API to remove image
        const response = await rpc('/account/user/remove/image', {});

        if (response.status === 'success') {
            // Update image preview
            imagePreview.src = PLACEHOLDER_IMAGE;

            // Hide delete button after successful deletion
            deleteButton.style.display = 'none';

            systemShowNotification(response.message, {
                type: 'success',
                duration: 3000
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.reload();
        } else {
            systemShowNotification(response.message || 'Failed to remove profile image', {
                type: 'error',
                duration: 3000
            });
        }
    } catch (error) {
        console.error('Error removing profile image:', error);
        systemShowNotification('Error removing profile image', {
            type: 'error',
            duration: 3000
        });
    } finally {
        // Reset loading state
        if (imageLabel) {
            toggleImageLoading(false, imageLabel);
        }
        deleteButton.innerHTML = '<i class="fa fa-trash text-xs"></i>';
        deleteButton.classList.remove('opacity-75', 'cursor-wait');
    }
};

// Initialize profile image handling
const initProfileImageUpload = () => {
    const imageInput = document.getElementById('profile-upload');
    const imagePreview = document.getElementById('profile-preview');
    const imageLabel = document.getElementById('profile-upload-label');
    const deleteButton = document.getElementById('profile-image-delete');

    if (!imageInput || !imagePreview) return;

    // Set up delete button
    if (deleteButton) {
        deleteButton.addEventListener('click', removeProfileImage);
    }

    // Handle image selection
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            systemShowNotification('Please select a valid image file', {
                type: 'error',
                duration: 3000
            });
            return;
        }

        // Validate file size (1MB max)
        if (file.size > 1024 * 1024 * 5) {
            systemShowNotification('Image size must be less than 5MB', {
                type: 'error',
                duration: 3000
            });
            return;
        }

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                // Start loading state
                toggleImageLoading(true, imageLabel);

                // Display preview
                imagePreview.src = event.target.result;

                // Upload image immediately
                const base64Data = event.target.result.split(',')[1];
                const response = await rpc('/account/user/upload/image', {
                    image_data: base64Data
                });

                if (response.status === 'success') {
                    // Show delete button after successful upload
                    if (deleteButton) {
                        deleteButton.style.display = '';
                    }
                }

                systemShowNotification(response.message, {
                    type: response.status === 'success' ? 'success' : 'error',
                    duration: 3000
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
                window.location.reload();
            } catch (error) {
                console.error('Error uploading image:', error);
                systemShowNotification('Error uploading image', {
                    type: 'error',
                    duration: 3000
                });
                // Reset preview on error
                imagePreview.src = imagePreview.getAttribute('data-original-src') || PLACEHOLDER_IMAGE;
            } finally {
                toggleImageLoading(false, imageLabel);
            }
        };

        reader.onerror = () => {
            systemShowNotification('Error reading image file', {
                type: 'error',
                duration: 3000
            });
            toggleImageLoading(false, imageLabel);
        };

        reader.readAsDataURL(file);
    });

    // Save original source for potential reset
    if (imagePreview.src) {
        imagePreview.setAttribute('data-original-src', imagePreview.src);
    }
};

// Submit profile form
const submitProfileForm = async (event) => {
    event.preventDefault();

    // Validate form
    if (!validateForm()) return;

    try {
        // Start loading state
        toggleFormLoading(true);

        // Collect form data
        const formData = {
            name: document.getElementById('account-user-name').value.trim(),
            email: document.getElementById('account-user-email').value.trim(),
            phone: document.getElementById('account-user-phone').value.trim(),
            mobile: document.getElementById('account-user-mobile').value.trim()
        };

        // Submit data
        const response = await rpc('/account/user/update/profile', formData);

        systemShowNotification(response.message, {
            type: response.status === 'success' ? 'success' : 'error',
            duration: 3000
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        systemShowNotification('Error updating profile', {
            type: 'error',
            duration: 3000
        });
    } finally {
        toggleFormLoading(false);
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the profile page
    const profileForm = document.getElementById('personal-form');
    if (!profileForm) return;

    // Initialize image upload
    initProfileImageUpload();

    // Setup form submission
    profileForm.addEventListener('submit', submitProfileForm);
});
