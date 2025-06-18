const sysFormValidate = (ref) => {
    let form = document.querySelector(ref)

    // Check if form exists
    if (!form) {
        systemShowNotification('Form not found', { type: 'error' })
        console.error(`Form not found: ${ref}`)
        return false
    }

    let isValid = true

    // Initialize form validation events if not already initialized
    if (!form.hasAttribute('data-validation-initialized')) {
        sysInitFormValidation(form);
    }

    let firstInvalidField = null

    // Reset previous validation state
    form.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid')
    })
    form.querySelectorAll('.invalid-feedback').forEach(feedback => {
        feedback.textContent = ''
    })

    // Validate all form fields
    form.querySelectorAll('input, select, textarea').forEach(field => {
        // Skip disabled fields or fields with data-validate="false"
        if (field.disabled || field.dataset.validate === 'false') {
            return
        }

        // Use the enhanced validation logic
        if (!sysValidateField(field, true)) {
            isValid = false;

            // Store first invalid field for focus
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        }
    })

    // Validate all radio groups
    const radioGroups = new Set();
    form.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (!radio.disabled && radio.required) {
            radioGroups.add(radio.name);
        }
    });

    radioGroups.forEach(name => {
        if (!sysValidateRadioGroup(name, true)) {
            isValid = false;
        }
    });

    // Validate code editors if any
    form.querySelectorAll('.code-editor-container').forEach(container => {
        const editorId = container.querySelector('div').id;
        // Check if editor instance exists in global scope
        if (window[`editor_${editorId}`]) {
            if (!sysValidateCodeEditor(editorId, window[`editor_${editorId}`], true)) {
                isValid = false;
            }
        }
    });

    // Focus first invalid field
    if (firstInvalidField) {
        firstInvalidField.focus();

        // Scroll into view with some spacing
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Add was-validated class to form for Bootstrap styling
    if (!isValid) {
        form.classList.add('was-validated');
    }

    return isValid;
}

/**
 * Collect all form data into a single object
 * @param {string} formSelector - The CSS selector for the form
 * @returns {Object} - The collected form data
 */
const sysCollectFormData = (formSelector) => {
    const form = document.querySelector(formSelector);
    if (!form) return {};

    const formData = {};
    const fileData = {};
    const specialFields = new Set(); // Track fields that need special handling

    // Process file inputs
    form.querySelectorAll('input[type="file"]').forEach(fileInput => {
        specialFields.add(fileInput.name);
        if(!fileInput.hasAttribute('name')) return;

        if (fileInput.files.length > 0) {
            // For multiple files
            if (fileInput.multiple) {
                fileData[fileInput.name] = Array.from(fileInput.files);
            } else {
                // For single file
                fileData[fileInput.name] = fileInput.files[0];
            }
        }
    });

    // Process select-multiple inputs
    form.querySelectorAll('select[multiple]').forEach(select => {
        specialFields.add(select.name);
        if(!select.hasAttribute('name')) return;
        formData[select.name] = Array.from(select.selectedOptions).map(option => option.value);
    });

    // Process checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (!checkbox.name) return;
        if(!checkbox.hasAttribute('name')) return;

        // Skip if this is part of a checkbox group which we'll handle separately
        if (form.querySelectorAll(`input[type="checkbox"][name="${checkbox.name}"]`).length > 1) {
            // Only process checkbox groups once
            if (!specialFields.has(checkbox.name)) {
                specialFields.add(checkbox.name);
                const checkboxes = form.querySelectorAll(`input[type="checkbox"][name="${checkbox.name}"]:checked`);
                formData[checkbox.name] = Array.from(checkboxes).map(cb => cb.value);
            }
        } else {
            // Individual checkbox
            formData[checkbox.name] = checkbox.checked;
        }
    });

    // Process radio groups
    const radioGroups = new Set();
    form.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (!radio.name || radioGroups.has(radio.name)) return;
        if(!radio.hasAttribute('name')) return;

        radioGroups.add(radio.name);
        specialFields.add(radio.name);

        const checkedRadio = form.querySelector(`input[type="radio"][name="${radio.name}"]:checked`);
        formData[radio.name] = checkedRadio ? checkedRadio.value : '';
    });

    // Process int fields
    form.querySelectorAll('input[type="number"]').forEach(input => {
        if(specialFields.has(input.name)) return;
        if(!input.hasAttribute('name')) return;

        formData[input.name] = parseInt(input.value);
        specialFields.add(input.name);
    });

    // Process all other standard inputs
    const basicInputs = form.querySelectorAll('input:not([type="file"]):not([type="radio"]):not([type="checkbox"]), textarea[name], select:not([multiple])');
    basicInputs.forEach(input => {
        // Skip fields already processed
        if (specialFields.has(input.name)) return;
        if (!input.hasAttribute('name')) return;

        // Add the standard field value
        formData[input.name] = input.value;
    });

    return { formData, fileData };
}

const sysDirectFormPost = async (url, payload, options={}) => {
    const { loading = true, loadingText = false } = options

    if(loading && loadingText) showLoadingScreen(loadingText)
    if(loading && !loadingText) showLoadingScreen()

    let headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };

    try {
        const fetchOptions = {
            method: 'POST',
            headers: headers,
            body: payload
        };

        const r = await fetch(url, fetchOptions);

        if(loading) hideLoadingScreen()

        if(r.status == 404) showFloatingNotification('Error', 'URL not found', 'error')
        if(r.status == 403) showFloatingNotification('Error', 'Forbidden', 'error')
        if(r.status == 401) showFloatingNotification('Error', 'Unauthorized', 'error')
        if(r.status == 500) showFloatingNotification('Error', 'Internal Server Error', 'error')
        if(r.status == 502) showFloatingNotification('Error', 'Bad Gateway', 'error')
        if(r.status == 503) showFloatingNotification('Error', 'Service Unavailable', 'error')
        if(r.status == 504) showFloatingNotification('Error', 'Gateway Timeout', 'error')

        const res = await r.json()

        if(res?.message) showFloatingNotification(res?.status == 'success' ? 'Success' : 'Error', res.message, res?.status || 'error')

        if(res?.errors) sysShowServerErrors(ref, res.errors)

        if(r.status == 200) return res
        if(r.status == 401) return { status: 'error', message: 'Unauthorized' }
        if(r.status == 403) return { status: 'error', message: 'Forbidden' }
        if(r.status == 404) return { status: 'error', message: 'Not Found' }
        if(r.status == 500) return { status: 'error', message: 'Internal Server Error' }
        if(r.status == 502) return { status: 'error', message: 'Bad Gateway' }
        if(r.status == 503) return { status: 'error', message: 'Service Unavailable' }
        if(r.status == 504) return { status: 'error', message: 'Gateway Timeout' }

        return { status: 'error', message: 'Unknown Error' }
    } catch(e) {
        console.error(e)
    }

    if(loading) hideLoadingScreen()

    return { status: 'error', message: 'Unknown Error' }

}

const sysFormPost = async (url, ref, options={}) => {
    if(!sysFormValidate(ref)) return;

    const { loading = true, loadingText = false } = options

    if(loading && loadingText) showLoadingScreen(loadingText)
    if(loading && !loadingText) showLoadingScreen()

    // Collect all form data
    const { formData, fileData } = sysCollectFormData(ref);
    let hasFiles = Object.keys(fileData).length > 0;

    // Create appropriate payload depending on if we have files
    let payload;
    let headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };

    if (hasFiles) {
        // Create a FormData object for multipart/form-data (files)
        payload = new FormData();

        // Add regular form fields
        for (const [key, value] of Object.entries(formData)) {
            if (Array.isArray(value)) {
                // Handle arrays (like multiple select values)
                value.forEach((item, index) => {
                    payload.append(`${key}[${index}]`, item);
                });
            } else {
                payload.append(key, value);
            }
        }

        // Add files
        for (const [key, value] of Object.entries(fileData)) {
            if (Array.isArray(value)) {
                // Handle multiple files
                value.forEach((file, index) => {
                    payload.append(`${key}[${index}]`, file);
                });
            } else {
                // Handle single file
                payload.append(key, value);
            }
        }

        // Don't set Content-Type header for FormData, browser will add with boundary
    } else {
        // Regular JSON payload for forms without files
        payload = JSON.stringify(formData);
        headers['Content-Type'] = 'application/json';
    }

    // Include custom headers from options if provided
    if (options.headers) {
        headers = { ...headers, ...options.headers };
    }

    try {
        const fetchOptions = {
            method: 'POST',
            headers: headers,
            body: payload
        };

        const r = await fetch(url, fetchOptions);

        if(loading) hideLoadingScreen()

        if(r.status == 404) showFloatingNotification('Error', 'URL not found', 'error')
        if(r.status == 403) showFloatingNotification('Error', 'Forbidden', 'error')
        if(r.status == 401) showFloatingNotification('Error', 'Unauthorized', 'error')
        if(r.status == 500) showFloatingNotification('Error', 'Internal Server Error', 'error')
        if(r.status == 502) showFloatingNotification('Error', 'Bad Gateway', 'error')
        if(r.status == 503) showFloatingNotification('Error', 'Service Unavailable', 'error')
        if(r.status == 504) showFloatingNotification('Error', 'Gateway Timeout', 'error')

        const res = await r.json()

        if(res?.message) showFloatingNotification(res?.status == 'success' ? 'Success' : 'Error', res.message, res?.status || 'error')

        if(res?.errors) sysShowServerErrors(ref, res.errors)

        if(r.status == 200) return res
        if(r.status == 401) return { status: 'error', message: 'Unauthorized' }
        if(r.status == 403) return { status: 'error', message: 'Forbidden' }
        if(r.status == 404) return { status: 'error', message: 'Not Found' }
        if(r.status == 500) return { status: 'error', message: 'Internal Server Error' }
        if(r.status == 502) return { status: 'error', message: 'Bad Gateway' }
        if(r.status == 503) return { status: 'error', message: 'Service Unavailable' }
        if(r.status == 504) return { status: 'error', message: 'Gateway Timeout' }

        return { status: 'error', message: 'Unknown Error' }
    } catch(e) {
        console.error(e)
    }

    if(loading) hideLoadingScreen()

    return { status: 'error', message: 'Unknown Error' }
}

/**
 * Show server errors on a form
 * @param {string} ref - The reference to the form
 * @param {Object} errors - The errors to show
 */
const sysShowServerErrors = (ref, errors) => {
    const form = document.querySelector(ref)
    if(!form) return

    for(const error of errors){
        const field = form.querySelector(`[name="${error[0]}"]`)
        if(!field) continue

        sysShowError(field, error[1])
    }
}

/**
 * Show error message for a form field
 * @param {HTMLElement} field - The field with error
 * @param {string} message - Error message to display
 */
const sysShowError = (field, message) => {
    if (!field) return;

    const fieldId = field.id;
    const errorId = `${fieldId}-error`;
    const errorElement = document.getElementById(errorId);

    // Add error class to field
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    // Show error message if error element exists
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none', 'invisible');
        errorElement.classList.add('active');
    }

    // Find parent container for icon handling
    const container = field.closest('.has-icon');
    if (container) {
        const icon = container.querySelector('.validation-icon');
        if (icon) {
            icon.classList.add('error');
            icon.classList.remove('valid');
            icon.style.display = 'block';
        }
    }
}

/**
 * Hide error message for a form field
 * @param {HTMLElement} field - The field to hide error for
 */
const sysHideError = (field) => {
    if (!field) return;

    const fieldId = field.id;
    const errorId = `${fieldId}-error`;
    const errorElement = document.getElementById(errorId);

    // Remove error class from field
    field.classList.remove('is-invalid');

    // Hide error message if error element exists
    if (errorElement) {
        errorElement.classList.add('d-none', 'invisible');
        errorElement.classList.remove('active');
    }

    // Find parent container for icon handling
    const container = field.closest('.has-icon');
    if (container) {
        const icon = container.querySelector('.validation-icon');
        if (icon) {
            icon.classList.remove('error');

            // If field is valid, show valid icon
            if (field.classList.contains('is-valid')) {
                icon.classList.add('valid');
                icon.style.display = 'block';

                // Update icon to checkmark
                const iconElement = icon.querySelector('i');
                if (iconElement) {
                    iconElement.className = 'fas fa-check-circle';
                }
            } else {
                icon.style.display = 'none';
            }
        }
    }
}

/**
 * Validate a single form field using HTML5 validation API
 * @param {HTMLElement} field - The field to validate
 * @param {boolean} showErrorMessages - Whether to show error messages
 * @returns {boolean} - Whether the field is valid
 */
const sysValidateField = (field, showErrorMessages = false) => {
    if (!field || field.disabled || field.dataset.validate === 'false') return true;

    let isValid = true;
    let errorMessage = '';

    // Special handling for Select2 fields
    if (field.classList.contains('select2-hidden-accessible')) {
        if (field.hasAttribute('multiple')) {
            isValid = field.selectedOptions.length > 0;
            errorMessage = 'Please select at least one option';
        } else {
            isValid = field.value !== '';
            errorMessage = 'Please select an option';
        }
    }
    // Special handling for file inputs
    else if (field.type === 'file') {
        // Check if field is required
        if (field.required) {
            isValid = field.files.length > 0;
            errorMessage = field.id.includes('profile') || field.id.includes('avatar') ?
                'Please upload a profile picture' : 'Please upload a file';
        }
    }
    // Special handling for checkboxes
    else if (field.type === 'checkbox') {
        // Check if field is required
        if (field.required) {
            isValid = field.checked;
            errorMessage = 'You must check this box to continue';
        }
    }
    // Enhanced validation for date inputs
    else if ((field.type === 'date' || field.type === 'datetime-local') ||
            (field.classList.contains('datepicker') || field.classList.contains('datetimepicker'))) {
        // Check if field is required
        if (field.required) {
            isValid = field.value !== '';

            // Handle the case where Flatpickr is used (field may be hidden)
            if (field._flatpickr) {
                isValid = field._flatpickr.selectedDates.length > 0;
            }

            errorMessage = 'Please select a date';

            if (field.classList.contains('datetimepicker')) {
                errorMessage = 'Please select a date and time';
            }
        } else {
            // If not required, it's valid as long as the format is correct
            isValid = field.checkValidity();
        }
    }
    // Use HTML5 validity for other input types
    else {
        isValid = field.checkValidity();

        // Get appropriate error message based on validity state
        if (!isValid) {
            const validity = field.validity;

            if (validity.valueMissing) {
                errorMessage = 'This field is required';
            } else if (validity.typeMismatch) {
                errorMessage = 'Please enter a valid format';
                if (field.type === 'email') errorMessage = 'Please enter a valid email address';
                if (field.type === 'url') errorMessage = 'Please enter a valid URL';
            } else if (validity.patternMismatch) {
                errorMessage = field.getAttribute('title') || 'Please match the requested format';
            } else if (validity.tooLong) {
                errorMessage = `Please shorten this text to ${field.maxLength} characters or less`;
            } else if (validity.tooShort) {
                errorMessage = `Please lengthen this text to ${field.minLength} characters or more`;
            } else if (validity.rangeUnderflow) {
                errorMessage = `Please select a value that is no less than ${field.min}`;
            } else if (validity.rangeOverflow) {
                errorMessage = `Please select a value that is no more than ${field.max}`;
            } else if (validity.stepMismatch) {
                errorMessage = 'Please select a valid value';
            } else if (validity.badInput) {
                errorMessage = 'Please enter a number';
            } else {
                errorMessage = 'The value you entered for this field is invalid';
            }
        }
    }

    // Update field visual validation state
    if (isValid) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        sysHideError(field);
    } else {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        if (showErrorMessages) {
            sysShowError(field, errorMessage);
        }
    }

    return isValid;
}

/**
 * Validate a radio button group
 * @param {string} name - The name attribute of the radio group
 * @param {boolean} showErrorMessages - Whether to show error messages
 * @returns {boolean} - Whether the radio group is valid
 */
const sysValidateRadioGroup = (name, showErrorMessages = false) => {
    const radioButtons = document.querySelectorAll(`input[name="${name}"]`);
    const errorElement = document.getElementById(`${name}-error`);
    const radioGroup = document.querySelector(`[name="${name}"]`).closest('.radio-group-inline') ||
                      document.querySelector(`[name="${name}"]`).closest('.space-y-1');

    // No buttons to validate
    if (!radioButtons.length) return true;

    // Check if any radio button is selected (valid state)
    let isValid = false;
    radioButtons.forEach(radio => {
        if (radio.checked) {
            isValid = true;
        }
    });

    // Apply validation styling
    if (isValid) {
        // Valid state - remove error styling
        if (radioGroup) {
            radioGroup.classList.remove('radio-group-error');
            radioGroup.classList.add('radio-group-valid');
        }
        if (errorElement) {
            errorElement.classList.add('d-none');
        }
    } else {
        // Invalid state - only show error if showErrorMessages is true
        if (radioGroup) {
            radioGroup.classList.remove('radio-group-valid');
            if (showErrorMessages) {
                radioGroup.classList.add('radio-group-error');
            }
        }

        if (errorElement && showErrorMessages) {
            errorElement.classList.remove('d-none');
        }
    }

    return isValid;
}

/**
 * Validate code editor field
 * @param {string} editorId - The ID of the code editor element
 * @param {object} editor - The CodeMirror/Monaco editor instance
 * @param {boolean} showErrorMessages - Whether to show error messages
 * @returns {boolean} - Whether the editor content is valid
 */
const sysValidateCodeEditor = (editorId, editor, showErrorMessages = false) => {
    if (!editor) return true;

    const editorElement = document.getElementById(editorId);
    const errorElement = document.getElementById(`${editorId}-error`);

    const isEmpty = editor.getValue().trim() === '';
    const isValid = !isEmpty;

    if (isValid) {
        editorElement.closest('.code-editor-container').classList.remove('is-invalid');
        editorElement.closest('.code-editor-container').classList.add('is-valid');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('d-none');
        }
    } else if (showErrorMessages) {
        editorElement.closest('.code-editor-container').classList.remove('is-valid');
        editorElement.closest('.code-editor-container').classList.add('is-invalid');
        if (errorElement) {
            errorElement.textContent = 'Please enter code';
            errorElement.classList.remove('d-none');
            errorElement.classList.add('active');
        }
    }

    return isValid;
}

/**
 * Initialize form validation by attaching appropriate event listeners to fields
 * @param {HTMLElement} form - The form element to initialize validation for
 */
const sysInitFormValidation = (form) => {
    if (!form || form.hasAttribute('data-validation-initialized')) return;

    // Mark the form as initialized
    form.setAttribute('data-validation-initialized', 'true');

    // Initialize regular input fields (text, email, number, etc.)
    form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="hidden"])').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        // Input, blur and change events
        field.addEventListener('input', () => sysValidateField(field, true));
        field.addEventListener('blur', () => sysValidateField(field, true));
        field.addEventListener('change', () => sysValidateField(field, true));
    });

    // Initialize textarea fields
    form.querySelectorAll('textarea').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        field.addEventListener('input', () => sysValidateField(field, true));
        field.addEventListener('blur', () => sysValidateField(field, true));
        field.addEventListener('change', () => sysValidateField(field, true));
    });

    // Initialize select fields
    form.querySelectorAll('select').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        field.addEventListener('change', () => sysValidateField(field, true));

        // For Select2 fields, listen to select2:select and select2:unselect events
        if (field.classList.contains('select2-hidden-accessible')) {
            $(field).on('select2:select select2:unselect', function() {
                setTimeout(() => sysValidateField(field, true), 0);
            });
        }
    });

    // Initialize checkbox fields
    form.querySelectorAll('input[type="checkbox"]').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        field.addEventListener('change', () => sysValidateField(field, true));
    });

    // Initialize radio button groups
    const radioGroups = new Set();
    form.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.disabled || radio.dataset.validate === 'false') return;

        if (!radioGroups.has(radio.name)) {
            radioGroups.add(radio.name);

            // Add event listener to all radios with the same name
            form.querySelectorAll(`input[name="${radio.name}"]`).forEach(radioButton => {
                radioButton.addEventListener('change', () => sysValidateRadioGroup(radio.name, true));
            });
        }
    });

    // Initialize file inputs
    form.querySelectorAll('input[type="file"]').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        field.addEventListener('change', () => sysValidateField(field, true));
    });

    // Initialize code editors if any
    form.querySelectorAll('.code-editor-container').forEach(container => {
        const editorId = container.querySelector('div').id;
        // Check if editor instance exists and set up change event handler
        if (window[`editor_${editorId}`]) {
            const editor = window[`editor_${editorId}`];

            // Different code editors have different event mechanisms
            if (editor.on) { // For CodeMirror
                editor.on('change', () => sysValidateCodeEditor(editorId, editor, true));
            } else if (editor.onDidChangeModelContent) { // For Monaco
                editor.onDidChangeModelContent(() => sysValidateCodeEditor(editorId, editor, true));
            }
        }
    });

    // For Flatpickr date/time pickers
    form.querySelectorAll('.datepicker, .datetimepicker').forEach(field => {
        if (field.disabled || field.dataset.validate === 'false') return;

        if (field._flatpickr) {
            field._flatpickr.config.onChange.push((selectedDates, dateStr) => {
                setTimeout(() => sysValidateField(field, true), 0);
            });
        }
    });
}

const sysInitFileUploadFields = () => {
    const fileUploadDropAreas = document.querySelectorAll('.file-drop-area');

    for(const dropArea of fileUploadDropAreas) {
        const fileReference = dropArea.dataset.field;
        const fileInput = dropArea.querySelector('input[type="file"]');
        const dropAreaText = dropArea.querySelector('.file-drop-area-text');
        const fileUploadHelp = dropArea.querySelector('#' + fileReference + 'Help');
        const filePreview = document.getElementById(fileReference + 'Preview');
        const fileEmptyState = dropArea.parentNode.querySelector('.file-empty-state');

        // Update help text based on whether multiple files are allowed
        const allowMultiple = fileInput && fileInput.hasAttribute('multiple');

        if (dropAreaText) {
            dropAreaText.textContent = allowMultiple
                ? 'Drag and drop multiple files here or'
                : 'Drag and drop a file here or';
        }

        if (fileUploadHelp) {
            fileUploadHelp.textContent = allowMultiple
                ? 'You can upload multiple files.'
                : 'You can upload only one file.';
        }

        // Skip if no drop area or file input
        if (!dropArea || !fileInput) continue;

        // Function to prevent default behaviors
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop area when file is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, (event) => {
                // Only apply the highlight effect if files are being dragged
                if (event.dataTransfer && event.dataTransfer.types &&
                    (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes('application/x-moz-file'))) {

                    dropArea.classList.add('file-drop-active');

                    // Animate the upload icon on drag
                    const uploadIcon = dropArea.querySelector('.file-drop-icon');
                    if (uploadIcon) {
                        uploadIcon.style.transform = 'translateY(-5px) scale(1.1)';
                        uploadIcon.style.color = '#0891b2';
                    }
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('file-drop-active');

                // Reset the icon animation
                const uploadIcon = dropArea.querySelector('.file-drop-icon');
                if (uploadIcon) {
                    uploadIcon.style.transform = '';
                    uploadIcon.style.color = '';
                }
            }, false);
        });

        /**
         * Format file size into a human-readable string
         */
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        /**
         * Remove a file from the input by index
         * @param {number} index - The index of the file to remove
         */
        const removeFile = (index) => {
            if (!fileInput || !fileInput.files.length) return;

            // Create a DataTransfer object to manipulate files
            const dt = new DataTransfer();

            // Add all files except the one to remove
            Array.from(fileInput.files)
                .filter((file, i) => i !== index)
                .forEach(file => dt.items.add(file));

            // Update the file input with the new file list
            fileInput.files = dt.files;

            // Update the preview
            updateFilePreview(fileInput.files);

            // Validate the field after removal
            sysValidateField(fileInput, true);
        };

        /**
         * Create a minimalist preview item for a single file
         * @param {File} file - The file to preview
         * @param {number} index - The index of the file in the list
         * @returns {HTMLElement} - The preview item element
         */
        const createFilePreviewItem = (file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-preview-item';
            fileItem.setAttribute('data-file-index', index);

            // Minimalist styling
            fileItem.style.display = 'flex';
            fileItem.style.alignItems = 'center';
            fileItem.style.justifyContent = 'space-between';
            fileItem.style.padding = '4px 6px';
            fileItem.style.borderRadius = '3px';
            fileItem.style.backgroundColor = '#f1f5f9';
            fileItem.style.transition = 'all 0.2s ease';

            // Left section with file info
            const fileInfoSection = document.createElement('div');
            fileInfoSection.style.display = 'flex';
            fileInfoSection.style.alignItems = 'center';
            fileInfoSection.style.overflow = 'hidden';
            fileInfoSection.style.flexGrow = '1';

            // Icon - smaller and more subtle
            const fileIcon = document.createElement('i');

            // Simplified icon set with muted colors
            if (file.type.startsWith('image/')) {
                fileIcon.className = 'fas fa-image';
            } else if (file.type === 'application/pdf') {
                fileIcon.className = 'fas fa-file-pdf';
            } else if (file.type.includes('word') || file.type.includes('doc')) {
                fileIcon.className = 'fas fa-file-word';
            } else if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.type.includes('csv')) {
                fileIcon.className = 'fas fa-file-excel';
            } else if (file.type.includes('zip') || file.type.includes('archive')) {
                fileIcon.className = 'fas fa-file-archive';
            } else {
                fileIcon.className = 'fas fa-file';
            }

            fileIcon.style.fontSize = '0.875rem';
            fileIcon.style.color = '#64748b';
            fileIcon.style.marginRight = '6px';
            fileIcon.style.width = '14px';
            fileIcon.style.textAlign = 'center';

            // Filename - clean and simple with ellipsis
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            fileName.style.fontSize = '0.875rem';
            fileName.style.color = '#334155';
            fileName.style.overflow = 'hidden';
            fileName.style.textOverflow = 'ellipsis';
            fileName.style.whiteSpace = 'nowrap';

            // File size - smaller and lighter
            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);
            fileSize.style.fontSize = '0.75rem';
            fileSize.style.color = '#94a3b8';
            fileSize.style.marginLeft = '8px';
            fileSize.style.flexShrink = '0';

            // Delete button - more subtle
            const removeBtn = document.createElement('button');
            removeBtn.setAttribute('type', 'button');
            removeBtn.setAttribute('aria-label', 'Remove file');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.style.background = 'none';
            removeBtn.style.border = 'none';
            removeBtn.style.color = '#cbd5e1';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.padding = '2px';
            removeBtn.style.marginLeft = '4px';
            removeBtn.style.fontSize = '0.75rem';
            removeBtn.style.display = 'flex';
            removeBtn.style.alignItems = 'center';
            removeBtn.style.justifyContent = 'center';
            removeBtn.style.transition = 'color 0.2s ease';

            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeFile(index);

                // Subtle fade-out animation
                fileItem.style.opacity = '0';
                fileItem.style.transform = 'translateX(4px)';
                setTimeout(() => {
                    if (fileItem.parentNode) {
                        fileItem.parentNode.removeChild(fileItem);
                    }
                }, 200);
            });

            // Hover effects
            fileItem.addEventListener('mouseover', () => {
                fileItem.style.backgroundColor = '#e2e8f0';
                removeBtn.style.color = '#94a3b8';
            });

            fileItem.addEventListener('mouseout', () => {
                fileItem.style.backgroundColor = '#f1f5f9';
                removeBtn.style.color = '#cbd5e1';
            });

            // Assemble the components
            fileInfoSection.appendChild(fileIcon);
            fileInfoSection.appendChild(fileName);

            fileItem.appendChild(fileInfoSection);
            fileItem.appendChild(fileSize);
            fileItem.appendChild(removeBtn);

            return fileItem;
        };

        /**
         * Update the file preview when files are selected
         * @param {FileList} files - The selected files
         */
        const updateFilePreview = (files) => {
            if (!filePreview) return;

            // Clear the existing preview
            filePreview.innerHTML = '';

            // Ensure no scrollbars appear
            filePreview.style.overflow = 'hidden';

            if (files && files.length) {
                // Create a minimalist file count indicator
                const fileCount = document.createElement('div');
                fileCount.className = 'file-count';
                fileCount.style.fontSize = '0.75rem';
                fileCount.style.color = '#64748b';
                fileCount.style.marginBottom = '8px';

                if (allowMultiple) {
                    fileCount.textContent = `${files.length} file${files.length > 1 ? 's' : ''}`;
                } else {
                    fileCount.textContent = 'File selected';
                }

                filePreview.appendChild(fileCount);

                // Create a minimalist container for file items
                const fileItemsContainer = document.createElement('div');
                fileItemsContainer.className = 'file-items-container';
                fileItemsContainer.style.display = 'flex';
                fileItemsContainer.style.flexDirection = 'column';
                fileItemsContainer.style.gap = '4px';

                // Limit preview to first 50 files to prevent performance issues
                const MAX_PREVIEW_FILES = 50;
                const filesToShow = Array.from(files).slice(0, MAX_PREVIEW_FILES);

                // Create a document fragment to batch DOM operations
                const fragment = document.createDocumentFragment();

                // Create preview items for each file
                filesToShow.forEach((file, index) => {
                    const fileItem = createFilePreviewItem(file, index);
                    fragment.appendChild(fileItem);
                });

                // Show message if not all files are displayed
                if (files.length > MAX_PREVIEW_FILES) {
                    const moreFilesMessage = document.createElement('div');
                    moreFilesMessage.className = 'more-files-message';
                    moreFilesMessage.style.fontSize = '0.75rem';
                    moreFilesMessage.style.color = '#64748b';
                    moreFilesMessage.style.marginTop = '4px';
                    moreFilesMessage.textContent = `+ ${files.length - MAX_PREVIEW_FILES} more files not shown`;
                    fragment.appendChild(moreFilesMessage);
                }

                // Append all items at once
                fileItemsContainer.appendChild(fragment);
                filePreview.appendChild(fileItemsContainer);

                sysHideError(fileInput);

                // If there's an empty state element, hide it when files are selected
                if (fileEmptyState) {
                    fileEmptyState.style.display = 'none';
                }
            } else if (fileEmptyState) {
                // If there's an empty state element, make sure it's visible when there are no files
                fileEmptyState.style.display = 'block';
            }
        };

        /**
         * Handle file selection from either input or drop
         * @param {FileList} files - The selected files
         */
        const handleFileSelection = (files) => {
            if (!files.length) return;

            // Use requestAnimationFrame to prevent UI freezing
            requestAnimationFrame(() => {
                // Limit total files to prevent performance issues (adjust as needed)
                const MAX_TOTAL_FILES = 200;

                // Create a DataTransfer object to manipulate the FileList
                let currentFiles = new DataTransfer();

                if (allowMultiple) {
                    // For multiple files, check if we're exceeding the limit
                    let totalFileCount = fileInput.files.length + files.length;

                    if (totalFileCount > MAX_TOTAL_FILES) {
                        // Show warning that we're limiting files
                        showFloatingNotification('Warning',
                            `Too many files selected. Limiting to ${MAX_TOTAL_FILES} files for performance.`,
                            'warning');

                        // Determine how many new files we can add
                        const availableSlots = Math.max(0, MAX_TOTAL_FILES - fileInput.files.length);

                        // Add existing files first
                        if (fileInput.files.length > 0) {
                            // Only take up to MAX_TOTAL_FILES existing files
                            const existingToKeep = Math.min(fileInput.files.length, MAX_TOTAL_FILES);
                            for (let i = 0; i < existingToKeep; i++) {
                                currentFiles.items.add(fileInput.files[i]);
                            }
                        }

                        // Then add new files up to available slots
                        for (let i = 0; i < Math.min(files.length, availableSlots); i++) {
                            currentFiles.items.add(files[i]);
                        }
                    } else {
                        // We're under the limit, so add all existing files
                        if (fileInput.files.length > 0) {
                            Array.from(fileInput.files).forEach(file => {
                                currentFiles.items.add(file);
                            });
                        }

                        // Then add all new files
                        Array.from(files).forEach(file => {
                            currentFiles.items.add(file);
                        });
                    }
                } else {
                    // For single file inputs, just take the first file
                    if (files.length > 0) {
                        currentFiles.items.add(files[0]);
                    }
                }

                try {
                    // Set the updated file list to the input
                    fileInput.files = currentFiles.files;
                } catch (e) {
                    console.warn('Direct files assignment not supported in this browser');
                }

                // Update the file name display in the drop area text
                const fileNames = Array.from(fileInput.files).map(f => f.name).join(', ');
                if (dropAreaText) {
                    // Only show first few filenames if there are many
                    const MAX_DISPLAY_NAMES = 3;
                    let displayText = '';

                    if (fileInput.files.length > MAX_DISPLAY_NAMES) {
                        const firstFew = Array.from(fileInput.files)
                            .slice(0, MAX_DISPLAY_NAMES)
                            .map(f => f.name)
                            .join(', ');
                        displayText = `${firstFew} and ${fileInput.files.length - MAX_DISPLAY_NAMES} more...`;
                    } else {
                        displayText = fileNames;
                    }

                    dropAreaText.textContent = displayText || (allowMultiple ?
                        'Drag and drop multiple files here or' :
                        'Drag and drop a file here or');
                }

                // Debounce the preview update to prevent UI freezing
                clearTimeout(fileInput._previewUpdateTimeout);
                fileInput._previewUpdateTimeout = setTimeout(() => {
                    const eventId = fileInput.id + ':change';
                    console.log(eventId);
                    document.dispatchEvent(new CustomEvent(eventId, { detail: { files: fileInput.files } }));
                    updateFilePreview(fileInput.files);

                    // Validate only after rendering is complete to prevent UI blocking
                    requestAnimationFrame(() => {
                        sysValidateField(fileInput, true);
                    });
                }, 100);

                // Add success feedback
                dropArea.classList.add('border-green-500');
                setTimeout(() => {
                    dropArea.classList.remove('border-green-500');
                }, 1500);
            });
        };

        // Handle dropped files
        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length) {
                // Transfer the dropped files to the file input
                handleFileSelection(files);

                // Add success feedback
                dropArea.classList.add('border-green-500');
                setTimeout(() => {
                    dropArea.classList.remove('border-green-500');
                }, 1500);
            }
        }, false);

        // Handle file input change
        fileInput.addEventListener('change', () => {
            // Only process if there are files and this isn't a programmatic change event
            if (fileInput.files.length && !event.detail?.programmatic) {
                // Process the selected files
                handleFileSelection(fileInput.files);

                // Add success feedback
                dropArea.classList.add('border-green-500');
                setTimeout(() => {
                    dropArea.classList.remove('border-green-500');
                }, 1500);
            }
        });

        // Initial preview update in case files are already selected
        if (fileInput.files && fileInput.files.length > 0) {
            updateFilePreview(fileInput.files);
        }
    }
}

const sysInitClipboardFields = () => {
    const clipboardFields = document.querySelectorAll('.clipboard-field-container');
    clipboardFields.forEach(container => {
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
                            systemShowNotification('Copying password requires permission in this browser', { type: 'warning' });
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
    });
}

document.addEventListener('DOMContentLoaded', () => {
    sysInitFileUploadFields()
    sysInitClipboardFields()

    // Initialize event listeners related to clipboard values that may change
    document.addEventListener('clipboard:update', function(e) {
        if (e.detail && e.detail.selector && e.detail.value) {
            const field = document.querySelector(e.detail.selector);
            if (field) {
                field.value = e.detail.value;
            }
        }
    });
})

// Forms and Fields Management
// This file contains all form-related functionality that's available globally across all pages

// Initialize modal functionality
function initUserModal() {
    const createUserModal = document.getElementById('create-user-modal');
    const addUserButton = document.getElementById('add-user-button');
    const createUserCancelButton = document.getElementById('create-user-cancel');
    const createUserSubmitButton = document.getElementById('create-user-submit');
    const createUserForm = document.getElementById('create-user-form');

    // Show modal when Add New User button is clicked
    if (addUserButton) {
        addUserButton.addEventListener('click', function() {
            Modal.open('create-user-modal');
        });
    }

    // Hide modal when Cancel button is clicked
    if (createUserCancelButton) {
        createUserCancelButton.addEventListener('click', function() {
            Modal.close('create-user-modal');
        });
    }

    // Submit form when Create User button is clicked
    if (createUserSubmitButton && createUserForm) {
        createUserSubmitButton.addEventListener('click', function() {
            // Validation
            if (createUserForm.checkValidity()) {
                const password = document.getElementById('user-password').value;
                const confirmPassword = document.getElementById('user-confirm-password').value;

                if (password !== confirmPassword) {
                    alert('Passwords do not match!');
                    return;
                }

                // Form is valid, handle submission (this would typically send data to a server)
                alert('User created successfully!');
                Modal.close('create-user-modal');
                createUserForm.reset();
            } else {
                // Trigger browser's native validation UI
                createUserForm.reportValidity();
            }
        });
    }

    // Close modal functionality is now handled by modals.js
    // No need for click outside or escape key handling as it's built into the Modal system
}

// Initialize form modal functionality
function initFormModal() {
    const openFormModalButton = document.getElementById('open-form-modal-button');
    const formModal = document.getElementById('formModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const saveModalFormBtn = document.getElementById('saveModalFormBtn');
    const yamlEditorElement = document.getElementById('yamlCodeEditor');

    // CodeMirror instance
    let codeEditor;

    // Return if elements don't exist
    if (!openFormModalButton || !formModal) return;

    // Open modal when button is clicked
    openFormModalButton.addEventListener('click', function() {
        Modal.open('formModal');

        // Initialize components after modal is visible
        setTimeout(() => {
            // Initialize CodeMirror for YAML editor if it exists
            initializeCodeMirror();

            // Initialize other components
            initializeFormComponents();

            // Reset validation state
            resetValidation();
        }, 50);
    });

    // Close modal when close button is clicked
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            Modal.close('formModal');
        });
    }

    // Close modal when cancel button is clicked
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', function() {
            Modal.close('formModal');
        });
    }

    // Handle form submission
    if (saveModalFormBtn) {
        saveModalFormBtn.addEventListener('click', function() {
            const isValid = validateForm();
            if (isValid) {
                // Show success notification
                systemShowNotification('Form submitted successfully!', { type: 'success' });
                // Close the modal
                Modal.close('formModal');
            } else {
                // Show error notification
                systemShowNotification('Please fix the errors in the form', { type: 'error' });

                // Scroll to the first error if possible
                const firstError = document.querySelector('.form-error[style*="display: block"]');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}

// Helper function to initialize CodeMirror
function initializeCodeMirror() {
    const yamlEditorElement = document.getElementById('yamlCodeEditor');
    if (yamlEditorElement && !yamlEditorElement.querySelector('.CodeMirror')) {
        const codeEditor = CodeMirror(yamlEditorElement, {
            mode: 'yaml',
            theme: 'dracula',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: true,
            value: "# Enter your YAML configuration here\nname: example\nversion: 1.0\nsettings:\n  enabled: true\n  timeout: 30",
        });
        // Adjust editor height
        codeEditor.setSize(null, 120);
    } else if (yamlEditorElement && yamlEditorElement.querySelector('.CodeMirror')) {
        // Refresh existing editor
        const cm = yamlEditorElement.querySelector('.CodeMirror').CodeMirror;
        if (cm) cm.refresh();
    }
}

// Helper function to initialize form components
function initializeFormComponents() {
    // Initialize flatpickr
    if (window.flatpickr) {
        flatpickr(".datepicker", {
            dateFormat: "Y-m-d",
            allowInput: true
        });

        flatpickr(".datetimepicker", {
            dateFormat: "Y-m-d H:i",
            enableTime: true,
            time_24hr: true,
            allowInput: true
        });
    }

    // Initialize Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        initializeSelect2Components();
    }

    // Initialize drag and drop file upload
    initDragDropUpload();

    // Initialize profile picture upload
    handleProfilePicture();
}

// Initialize Select2 components globally
function initializeSelect2Components() {
    // Single select elements
    $('.select2-single').each(function() {
        // Destroy if already initialized to prevent duplicates
        if ($(this).data('select2')) {
            $(this).select2('destroy');
        }

        // Initialize
        $(this).select2({
            placeholder: "Select an option",
            allowClear: true,
            containerCssClass: 'text-sm',
            dropdownCssClass: 'text-sm',
            minimumResultsForSearch: 8
        });
    });

    // Multiple select elements
    $('.select2-multiple').each(function() {
        // Destroy if already initialized
        if ($(this).data('select2')) {
            $(this).select2('destroy');
        }

        // Initialize
        $(this).select2({
            placeholder: "Select options",
            allowClear: true,
            containerCssClass: 'text-sm',
            dropdownCssClass: 'text-sm',
            minimumResultsForSearch: 8
        });
    });

    // Adjust Select2 size for better appearance
    $('.select2-container--default .select2-selection--single').css({
        'height': '32px',
        'padding': '2px 8px',
        'font-size': '0.875rem'
    });

    $('.select2-container--default .select2-selection--multiple').css({
        'min-height': '32px',
        'font-size': '0.875rem'
    });

    $('.select2-container--default .select2-selection--single .select2-selection__arrow').css({
        'height': '32px'
    });

    console.log('Select2 components initialized');
}

// Helper functions for form validation
function resetValidation() {
    // Placeholder for form validation reset
    console.log("Form validation reset");
}

function validateForm() {
    // Placeholder for form validation
    // In a real implementation, this would validate all form fields
    return true;
}

function initDragDropUpload() {
    // Placeholder for drag and drop upload initialization
    console.log("Drag and drop upload initialized");
}

function handleProfilePicture() {
    // Placeholder for profile picture handling
    console.log("Profile picture handling initialized");
}

// Initialize the launch form button
function initLaunchFormButton() {
    const launchButton = document.getElementById('launch-form-button');
    if (!launchButton) return;

    launchButton.addEventListener('click', function() {
        const modalId = 'example-modal';

        // Use the new Modal.open() syntax
        Modal.open(modalId);

        // Initialize form fields after modal is visible
        setTimeout(() => {
            initializeModalFormFields(document.getElementById(modalId));
            setupSaveButtonEvents(document.getElementById(modalId));
        }, 50); // Small delay to ensure modal is visible
    });
}

// Initialize form modal buttons with data-modal-open attribute
function initFormModalButtons() {
    // Find all buttons that open form modals
    const formModalButtons = document.querySelectorAll('[data-modal-open="example-form-modal"]');

    console.log(`Found ${formModalButtons.length} form modal buttons`);

    // Add event listeners to buttons
    formModalButtons.forEach(button => {
        // Remove any existing event listeners by cloning the button
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Add event listener to the new button
        newButton.addEventListener('click', function() {
            // Modal will be opened via data-modal-open attribute by modals.js
            console.log('Form modal button clicked, initializing fields after open');

            // Initialize form fields after modal is visible
            setTimeout(() => {
                const modal = document.getElementById('example-form-modal');
                if (modal) {
                    console.log('Initializing modal form fields');
                    initializeModalFormFields(modal);
                    setupSaveButtonEvents(modal);
                } else {
                    console.error('Modal element not found');
                }
            }, 100); // Slightly longer timeout to ensure modal is visible
        });
    });
}

// Function to initialize all form fields in the modal
function initializeModalFormFields(modal) {
    if (!modal) return;

    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) form.reset();

    // Initialize CodeMirror instances
    const yamlEditorElement = modal.querySelector('#yamlCodeEditor');
    if (yamlEditorElement) {
        if (!yamlEditorElement.querySelector('.CodeMirror')) {
            // If CodeMirror isn't initialized yet, create it
            const codeEditor = CodeMirror(yamlEditorElement, {
                mode: 'yaml',
                theme: 'dracula',
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                lineWrapping: true,
                value: "# Enter your YAML configuration here\nname: example\nversion: 1.0\nsettings:\n  enabled: true\n  timeout: 30",
            });
            // Adjust editor height
            codeEditor.setSize(null, 120);
        } else {
            // Refresh existing editor
            const cm = yamlEditorElement.querySelector('.CodeMirror').CodeMirror;
            if (cm) {
                cm.refresh();
                // Reset content if needed
                cm.setValue("# Enter your YAML configuration here\nname: example\nversion: 1.0\nsettings:\n  enabled: true\n  timeout: 30");
            }
        }
    }

    // Initialize flatpickr for date/time inputs
    if (window.flatpickr) {
        const datePickers = modal.querySelectorAll(".datepicker");
        if (datePickers.length > 0) {
            datePickers.forEach(picker => {
                flatpickr(picker, {
                    dateFormat: "Y-m-d",
                    allowInput: true
                });
            });
        }

        const dateTimePickers = modal.querySelectorAll(".datetimepicker");
        if (dateTimePickers.length > 0) {
            dateTimePickers.forEach(picker => {
                flatpickr(picker, {
                    dateFormat: "Y-m-d H:i",
                    enableTime: true,
                    time_24hr: true,
                    allowInput: true
                });
            });
        }
    }

    // Initialize Select2 for searchable selects
    if (typeof $ !== 'undefined' && $.fn.select2) {
        const select2Elements = modal.querySelectorAll('.select2-single, .select2-multiple');

        select2Elements.forEach(element => {
            // Destroy if already initialized to prevent duplicates
            if ($(element).data('select2')) {
                $(element).select2('destroy');
            }

            // Re-initialize
            if (element.classList.contains('select2-single')) {
                $(element).select2({
                    dropdownParent: $(modal),
                    placeholder: "Select an option",
                    allowClear: true,
                    containerCssClass: 'text-sm',
                    dropdownCssClass: 'text-sm',
                    minimumResultsForSearch: 8
                });
            } else if (element.classList.contains('select2-multiple')) {
                $(element).select2({
                    dropdownParent: $(modal),
                    placeholder: "Select options",
                    allowClear: true,
                    containerCssClass: 'text-sm',
                    dropdownCssClass: 'text-sm',
                    minimumResultsForSearch: 8
                });
            }
        });

        // Adjust Select2 size after initialization
        $('.select2-container--default .select2-selection--single').css({
            'height': '32px',
            'padding': '2px 8px',
            'font-size': '0.875rem'
        });

        $('.select2-container--default .select2-selection--multiple').css({
            'min-height': '32px',
            'font-size': '0.875rem'
        });

        $('.select2-container--default .select2-selection--single .select2-selection__arrow').css({
            'height': '32px'
        });
    }

    // Reset file inputs
    const fileInputs = modal.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.value = '';
        // Also clear any file previews
        const previewElem = document.getElementById('filePreview');
        if (previewElem) previewElem.innerHTML = '';

        const profilePicPreview = document.getElementById('profilePicturePreview');
        if (profilePicPreview) {
            profilePicPreview.classList.add('hidden');
            profilePicPreview.src = '#';
        }

        const picPlaceholder = document.getElementById('profilePicturePlaceholder');
        if (picPlaceholder) picPlaceholder.classList.remove('hidden');
    });

    // Clear any validation states/errors
    const errorElements = modal.querySelectorAll('.form-error');
    errorElements.forEach(el => {
        el.style.display = 'none';
    });

    const validationIcons = modal.querySelectorAll('.validation-icon');
    validationIcons.forEach(icon => {
        icon.style.display = 'none';
    });

    // Initialize drag and drop for file uploads
    initializeDragDropArea(modal);
}

// Initialize drag and drop functionality for file upload areas
function initializeDragDropArea(modal) {
    const dropArea = modal.querySelector('#dropArea');
    const fileInput = modal.querySelector('#fileUpload');

    if (!dropArea || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener('drop', handleDrop, false);
    });

    function highlight() {
        dropArea.classList.add('file-drop-area-active');
    }

    function unhighlight() {
        dropArea.classList.remove('file-drop-area-active');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            fileInput.files = files;
            updateFilePreview(files[0]);
        }
    }

    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            updateFilePreview(this.files[0]);
        }
    });

    // Update the file preview area
    function updateFilePreview(file) {
        const preview = document.getElementById('filePreview');
        if (!preview) return;

        preview.innerHTML = '';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.classList.add('max-h-20', 'rounded');
            img.file = file;
            preview.appendChild(img);

            const reader = new FileReader();
            reader.onload = (function(aImg) {
                return function(e) { aImg.src = e.target.result; };
            })(img);
            reader.readAsDataURL(file);
        }

        const fileInfo = document.createElement('div');
        fileInfo.classList.add('text-xs', 'text-gray-600', 'mt-1');
        fileInfo.innerHTML = `
            <div><span class="font-medium">File:</span> ${file.name}</div>
            <div><span class="font-medium">Size:</span> ${formatFileSize(file.size)}</div>
            <div><span class="font-medium">Type:</span> ${file.type || 'Unknown'}</div>
        `;
        preview.appendChild(fileInfo);
    }
}

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to set up events for the save button
function setupSaveButtonEvents(modal) {
    if (!modal) return;

    const saveButton = modal.querySelector('.modal-btn-primary');
    if (!saveButton) return;

    // Remove any existing event listeners (to prevent duplicates)
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    // Add click event to the save button
    newSaveButton.addEventListener('click', function(e) {
        e.preventDefault();

        // Validate the form (assuming there's a validation function)
        const form = modal.querySelector('form');
        let isValid = true;

        if (form) {
            // Basic validation - check required fields
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                if (!field.value) {
                    isValid = false;
                    // Highlight invalid field
                    field.classList.add('border-red-500');

                    // Find and show the error message
                    const fieldId = field.id;
                    const errorElement = modal.querySelector(`#${fieldId}-error`);
                    if (errorElement) {
                        errorElement.style.display = 'block';
                    }
                } else {
                    field.classList.remove('border-red-500');

                    // Hide error message if it exists
                    const fieldId = field.id;
                    const errorElement = modal.querySelector(`#${fieldId}-error`);
                    if (errorElement) {
                        errorElement.style.display = 'none';
                    }
                }
            });
        }

        if (isValid) {
            // Show success notification
            if (typeof showNotification === 'function') {
                systemShowNotification('Form saved successfully!', 'success');
            }

            // Trigger confetti celebration
            triggerConfetti();

            // Close modal after a short delay (to see the notification and confetti)
            setTimeout(() => {
                Modal.close(modal.id);
            }, 1500);
        } else {
            // Show error notification
            if (typeof showNotification === 'function') {
                systemShowNotification('Please fill in all required fields', 'error');
            }

            // Find first error and scroll to it
            const firstError = modal.querySelector('.form-error[style*="display: block"]');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

// Function to trigger confetti celebration
function triggerConfetti() {
    // Check if confetti library is available
    if (typeof confetti === 'function') {
        // Create a more celebratory confetti effect
        const end = Date.now() + 3000; // 3 seconds of confetti

        const colors = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#ffffff']; // Cyan theme colors

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: colors
            });

            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: colors
            });

            // Keep creating confetti until the end time
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();

        // Also add a one-time big burst
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors
        });
    }
}

// Initialize datepickers function
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

// Reinitialize all datepickers function
function reinitializeAllDatepickers() {
    // Fix for any datepickers in the advanced search panel
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    if (advancedSearchPanel) {
        const filterLines = advancedSearchPanel.querySelectorAll('.filter-line');
        filterLines.forEach(line => {
            initializeDatepickers(line);
        });
    }

    // Also initialize any datepickers in modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const dateInputs = modal.querySelectorAll('.datepicker, .datetimepicker');
        if (dateInputs.length > 0 && window.flatpickr) {
            dateInputs.forEach(input => {
                if (input.classList.contains('datepicker')) {
                    flatpickr(input, {
                        dateFormat: "Y-m-d",
                        allowInput: true
                    });
                } else if (input.classList.contains('datetimepicker')) {
                    flatpickr(input, {
                        dateFormat: "Y-m-d H:i",
                        enableTime: true,
                        time_24hr: true,
                        allowInput: true
                    });
                }
            });
        }
    });
}

// Export functions to window object so they can be used globally
window.initUserModal = initUserModal;
window.initFormModal = initFormModal;
window.initializeCodeMirror = initializeCodeMirror;
window.initializeFormComponents = initializeFormComponents;
window.resetValidation = resetValidation;
window.validateForm = validateForm;
window.initDragDropUpload = initDragDropUpload;
window.handleProfilePicture = handleProfilePicture;
window.initLaunchFormButton = initLaunchFormButton;
window.initializeModalFormFields = initializeModalFormFields;
window.initializeDragDropArea = initializeDragDropArea;
window.formatFileSize = formatFileSize;
window.setupSaveButtonEvents = setupSaveButtonEvents;
window.triggerConfetti = triggerConfetti;
window.initializeDatepickers = initializeDatepickers;
window.reinitializeAllDatepickers = reinitializeAllDatepickers;
window.initFormModalButtons = initFormModalButtons;

// Initialize forms when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize key form functionality
    if (typeof initUserModal === 'function') initUserModal();
    if (typeof initFormModal === 'function') initFormModal();

    // Initialize form buttons if they exist
    if (typeof initLaunchFormButton === 'function') initLaunchFormButton();

    // Initialize form modal buttons with data-modal-open attribute
    if (typeof initFormModalButtons === 'function') initFormModalButtons();

    // Initialize any date pickers
    setTimeout(reinitializeAllDatepickers, 500);
});
