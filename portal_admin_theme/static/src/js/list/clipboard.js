/**
 * Initialize clipboard functionality for all clipboard fields
 * Supports both text and password type fields and dynamic number of fields
 */
function initClipboardFields() {
    // Find all clipboard field containers
    const clipboardContainers = document.querySelectorAll('.clipboard-field-container');

    clipboardContainers.forEach(container => {
        initSingleClipboardField(container);
    });
}

/**
 * Initialize a single clipboard field
 * @param {HTMLElement} container - The clipboard field container element
 */
function initSingleClipboardField(container) {
    const inputField = container.querySelector('input[type="text"], input[type="password"]');
    const copyButton = container.querySelector('.clipboard-append-btn');
    const feedbackElem = container.querySelector('.clipboard-feedback');

    if (!inputField || !copyButton) return; // Skip if missing elements

    copyButton.addEventListener('click', function() {
        const isPassword = inputField.type === 'password';

        // Use different approaches based on field type and available APIs
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // Modern approach - use Clipboard API for both text and password
            // This doesn't require making the password visible
            navigator.clipboard.writeText(inputField.value)
                .then(() => {
                    showCopySuccess();
                })
                .catch(err => {
                    console.error('Failed to copy using Clipboard API: ', err);

                    // Only fallback to the older method for text fields, not passwords
                    if (!isPassword) {
                        fallbackCopyMethod();
                    } else {
                        showNotification('Copying password requires permission in this browser', 'warning');
                    }
                });
        } else {
            // Old browsers without clipboard API
            if (isPassword) {
                // For passwords, create a temporary text field to avoid showing the actual password
                secureCopyPassword();
            } else {
                // For regular text, use the select/execCommand approach
                fallbackCopyMethod();
            }
        }

        function fallbackCopyMethod() {
            // Select the text
            inputField.select();
            inputField.setSelectionRange(0, 99999); // For mobile devices

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showCopySuccess();
                }
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }

            // Deselect the text
            window.getSelection().removeAllRanges();
        }

        function secureCopyPassword() {
            // Create a temporary, off-screen input element
            const tempInput = document.createElement('input');
            tempInput.type = 'text';
            tempInput.value = inputField.value;

            // Make it invisible and add to body
            tempInput.style.position = 'absolute';
            tempInput.style.left = '-9999px';
            document.body.appendChild(tempInput);

            // Select and copy
            tempInput.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showCopySuccess();
                }
            } catch (err) {
                console.error('Failed to copy password: ', err);
            }

            // Remove the temporary element
            document.body.removeChild(tempInput);
        }

        function showCopySuccess() {
            // Show success message
            if (feedbackElem) {
                feedbackElem.classList.add('show');

                // Hide after 2 seconds
                setTimeout(() => {
                    feedbackElem.classList.remove('show');
                }, 2000);
            }

            // Flash effect on button for visual feedback
            copyButton.classList.add('bg-green-500', 'border-green-500');
            setTimeout(() => {
                copyButton.classList.remove('bg-green-500', 'border-green-500');
            }, 300);
        }
    });
}

/**
 * Dynamically create a clipboard field and add it to a container
 * @param {string} containerId - ID of container to add field to
 * @param {string} value - Value to put in clipboard field
 * @param {string} type - Field type (text or password)
 * @param {string} label - Optional label for the field
 * @return {HTMLElement} The created container element
 */
function createClipboardField(containerId, value, type = 'text', label = '') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // Create clipboard field structure
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'clipboard-field-container';

    // Add label if provided
    if (label) {
        const labelElem = document.createElement('label');
        labelElem.className = 'form-label form-label-sm block mb-1';
        labelElem.textContent = label;
        fieldContainer.appendChild(labelElem);
    }

    const inputGroup = document.createElement('div');
    inputGroup.className = 'clipboard-input-group';

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input-sm';
    input.value = value;
    input.readOnly = true;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clipboard-append-btn';
    button.innerHTML = '<i class="fas fa-copy"></i>';

    inputGroup.appendChild(input);
    inputGroup.appendChild(button);

    const feedback = document.createElement('div');
    feedback.className = 'clipboard-feedback';
    feedback.innerHTML = '<i class="fas fa-check"></i> Copied to clipboard!';

    fieldContainer.appendChild(inputGroup);
    fieldContainer.appendChild(feedback);

    // Add to container
    container.appendChild(fieldContainer);

    // Return the created container for further manipulation if needed
    return fieldContainer;
}

// Setup dynamic clipboard fields on document ready
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for dynamic clipboard field button
    const addClipboardBtn = document.getElementById('addClipboardField');
    if (addClipboardBtn) {
        addClipboardBtn.addEventListener('click', function() {
            // Generate a random API key as an example
            const apiKey = generateRandomApiKey();

            // Create a new clipboard field and add it to the container
            const newField = createClipboardField('dynamicClipboardContainer', apiKey, 'text', 'API Key ' + (document.querySelectorAll('#dynamicClipboardContainer .clipboard-field-container').length + 1));

            // Initialize the new clipboard field
            initSingleClipboardField(newField);
        });
    }

    // Initialize event listeners for clipboard:update events
    document.addEventListener('clipboard:update', function(e) {
        if (e.detail && e.detail.selector && e.detail.value) {
            const field = document.querySelector(e.detail.selector);
            if (field) {
                field.value = e.detail.value;
            }
        }
    });
});

/**
 * Generate a random API key for demonstration purposes
 * @returns {string} A random API key
 */
function generateRandomApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const keyLength = 16;
    let result = '';

    for (let i = 0; i < keyLength; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}
