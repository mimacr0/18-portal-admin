import { rpc } from "@web/core/network/rpc";

const reloadProductsListPage = async () => {

    const pageListItems = document.getElementById('products-page-list-items');

    if(!pageListItems) return;

    const res = await rpc('/account/account/products/list/reload');
    if(res?.status != 'success') return;

    if(pageListItems) pageListItems.innerHTML = res.list;

    const paginationContainer = document.getElementById('products-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

}

const initProductsManagementListPage = () => {
    const createButton = document.getElementById('launch-create-products-form-button');
    if(createButton) createButton.addEventListener('click', () => {
        Modal.open('package-recepction-create-modal');
    });
    const fileUploadButton = document.getElementById('page-list-products-tools-action-import');
    if(fileUploadButton) fileUploadButton.addEventListener('click', () => {
        Modal.open('file-upload-modal');
    });
}

// Helper function to create file icon based on file type
function createFileIcon(file) {
    // Determine file type icon and color
    let iconClass = 'fa-file';
    let iconColor = 'text-gray-500';

    if (file.type && file.type.startsWith('image/')) {
        iconClass = 'fa-file-image';
        iconColor = 'text-blue-500';
    } else if (file.type && file.type.includes('pdf')) {
        iconClass = 'fa-file-pdf';
        iconColor = 'text-red-500';
    } else if (file.type && file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        iconClass = 'fa-file-word';
        iconColor = 'text-blue-600';
    } else if (file.type && file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        iconClass = 'fa-file-excel';
        iconColor = 'text-green-600';
    } else if (file.type && (file.type.includes('zip') || file.type.includes('rar'))) {
        iconClass = 'fa-file-archive';
        iconColor = 'text-yellow-600';
    } else if (file.type && file.type.includes('audio')) {
        iconClass = 'fa-file-audio';
        iconColor = 'text-purple-500';
    } else if (file.type && file.type.includes('video')) {
        iconClass = 'fa-file-video';
        iconColor = 'text-pink-500';
    }

    // Create the icon element
    const icon = document.createElement('div');
    icon.classList.add('flex-shrink-0', 'mr-1.5');
    icon.innerHTML = `<i class="fas ${iconClass} ${iconColor}"></i>`;

    return icon;
}

// Format file size helper
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update the file preview area
function updateFilePreview(files, previewElement) {
    if (!previewElement || !files || files.length === 0) {
        return;
    }

    // Clear previous preview
    previewElement.innerHTML = '';

    // Check if this is a single file input or multiple files
    const isMultiple = files.length > 1 || files[0].webkitRelativePath;

    if (isMultiple) {
        // Multiple files UI
        const filesContainer = document.createElement('div');
        filesContainer.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-2', 'w-full');

        // Add file count indicator
        const fileCountBar = document.createElement('div');
        fileCountBar.classList.add('col-span-full', 'text-xs', 'text-gray-600', 'dark:text-gray-400', 'mb-2', 'pb-1', 'border-b', 'border-gray-200', 'dark:border-gray-700');
        fileCountBar.innerHTML = `<span class="font-medium">${files.length}</span> file${files.length > 1 ? 's' : ''} selected`;
        filesContainer.appendChild(fileCountBar);

        // Process each file
        Array.from(files).forEach(file => {
            // Create a minimalist file item
            const fileItem = document.createElement('div');
            fileItem.classList.add('flex', 'items-center', 'bg-gray-50', 'dark:bg-gray-800', 'rounded', 'p-1.5', 'border', 'border-gray-200', 'dark:border-gray-700');

            // File type icon and styling
            const icon = createFileIcon(file);

            // Create a file info wrapper with controlled width
            const fileInfoWrapper = document.createElement('div');
            fileInfoWrapper.classList.add('flex-1', 'min-w-0');

            // Create the file name element inside the wrapper
            const fileNameElement = document.createElement('div');
            fileNameElement.classList.add('truncate', 'text-xs');
            fileNameElement.title = `${file.name} (${formatFileSize(file.size)})`;
            fileNameElement.textContent = file.name;
            fileInfoWrapper.appendChild(fileNameElement);

            // Create a remove button
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('flex-shrink-0', 'ml-1.5', 'text-gray-400', 'hover:text-red-500', 'text-xs');
            removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
            removeBtn.title = "Remove file";
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                fileItem.remove();

                // Update file count
                const remainingFiles = filesContainer.querySelectorAll('.flex.items-center') || [];
                fileCountBar.innerHTML = `<span class="font-medium">${remainingFiles.length}</span> file${remainingFiles.length > 1 ? 's' : ''} selected`;

                if (remainingFiles.length === 0) {
                    previewElement.innerHTML = '';
                }
            };

            // Assemble the file item
            fileItem.appendChild(icon);
            fileItem.appendChild(fileInfoWrapper);
            fileItem.appendChild(removeBtn);

            // Add to the container
            filesContainer.appendChild(fileItem);
        });

        previewElement.appendChild(filesContainer);
    } else {
        // Single file UI
        const file = files[0];
        const fileItem = document.createElement('div');
        fileItem.classList.add('flex', 'items-center', 'bg-gray-50', 'dark:bg-gray-800', 'rounded', 'p-2', 'border', 'border-gray-200', 'dark:border-gray-700', 'w-full');

        // File icon or small thumbnail
        if (file.type && file.type.startsWith('image/')) {
            // Small image thumbnail
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('flex-shrink-0', 'mr-3', 'size-8', 'rounded', 'overflow-hidden', 'bg-white', 'dark:bg-gray-700');

            const img = document.createElement('img');
            img.classList.add('w-full', 'h-full', 'object-cover');
            img.alt = file.name;

            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            imgContainer.appendChild(img);
            fileItem.appendChild(imgContainer);
        } else {
            // File type icon
            const icon = createFileIcon(file);
            icon.classList.add('mr-3');
            fileItem.appendChild(icon);
        }

        // File info
        const fileInfo = document.createElement('div');
        fileInfo.classList.add('flex-1', 'min-w-0');

        const fileName = document.createElement('div');
        fileName.classList.add('truncate', 'text-sm', 'font-medium', 'text-gray-800', 'dark:text-gray-200');
        fileName.title = file.name;
        fileName.textContent = file.name;

        const fileSize = document.createElement('div');
        fileSize.classList.add('text-xs', 'text-gray-500', 'dark:text-gray-400');
        fileSize.textContent = formatFileSize(file.size);

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('flex-shrink-0', 'ml-2', 'text-gray-400', 'hover:text-red-500');
        removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
        removeBtn.title = "Remove file";
        removeBtn.onclick = function() {
            previewElement.innerHTML = '';
        };

        fileItem.appendChild(removeBtn);
        previewElement.appendChild(fileItem);
    }
}

// Initialize drag and drop functionality for file upload areas
function initDragDropUpload(container) {
    const dropArea = container.querySelector('.file-drop-area');
    const fileInput = container.querySelector('input[type="file"]');
    const previewArea = container.querySelector('.file-preview');
    const browseLink = container.querySelector('.browse-link');

    if (!dropArea || !fileInput) return;

    let isDialogOpen = false;
    const allowMultiple = fileInput.hasAttribute('multiple');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function openFileDialog() {
        if (!isDialogOpen) {
            isDialogOpen = true;
            fileInput.click();
            setTimeout(() => {
                isDialogOpen = false;
            }, 1000);
        }
    }

    // Add click handler to the drop area
    dropArea.addEventListener('click', function(e) {
        if (!e.target.closest('.browse-link')) {
            openFileDialog();
        }
    });

    // Handle browse link click
    if (browseLink) {
        browseLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openFileDialog();
        });
    }

    // Highlight drop area when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.add('file-drop-area-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.remove('file-drop-area-active');
        }, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            if (!allowMultiple && files.length > 1) {
                const singleFile = new DataTransfer();
                singleFile.items.add(files[0]);
                fileInput.files = singleFile.files;
                updateFilePreview(singleFile.files, previewArea);
            } else {
                fileInput.files = files;
                updateFilePreview(files, previewArea);
            }
        }
    }, false);

    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            try {
                updateFilePreview(this.files, previewArea);
                isDialogOpen = false;

                // Remove error state if it was applied
                this.classList.remove('border-red-500');
                const errorElement = container.querySelector('.form-error');
                if (errorElement) {
                    errorElement.style.display = 'none';
                }

                // Show the preview area
                if (previewArea) {
                    previewArea.style.display = 'flex';
                }
            } catch (err) {
                console.error('Error handling file selection:', err);
            }
        }
    });
}

// Initialize file upload modal
function initFileUploadModal() {
    const fileUploadModal = document.getElementById('file-upload-modal');
    if (!fileUploadModal) return;

    initDragDropUpload(fileUploadModal);

    const saveBtn = fileUploadModal.querySelector('.modal-btn-primary');

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            let isValid = true;
            const fileInput = fileUploadModal.querySelector('input[type="file"][required]');

            if (fileInput && (!fileInput.files || fileInput.files.length === 0)) {
                isValid = false;
                fileInput.classList.add('border-red-500');
                const errorElement = fileUploadModal.querySelector('.form-error');
                if (errorElement) {
                    errorElement.style.display = 'block';
                }
            }

            if (isValid) {
                // Close modal after a short delay
                setTimeout(() => {
                    Modal.close('file-upload-modal');
                }, 1500);
            }
        });
    }

    // Re-initialize file upload when modal opens
    document.addEventListener('modalOpened', function(e) {
        if (e.detail.modalId === 'file-upload-modal') {
            initDragDropUpload(fileUploadModal);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    reloadProductsListPage();
    initProductsManagementListPage();
    initFileUploadModal();
});
