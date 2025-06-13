import { reloadReceptionListPage } from './reception_list.js';

/**
 * Inicializa el modal de carga de archivos para recepciones
 *
 * Esta función configura:
 * 1. Eventos de arrastrar y soltar archivos
 * 2. Vista previa de archivos seleccionados
 * 3. Validación de archivos
 * 4. Envío del formulario
 */
export const initFileUploadModal = () => {
    const fileUploadModal = document.getElementById('file-upload-modal');
    if (!fileUploadModal) return;

    const fileInput = document.getElementById('fileInput');
    const fileDropArea = document.querySelector('.file-drop-area');
    const filePreview = document.querySelector('.file-preview');
    const browseLink = document.querySelector('.browse-link');
    const uploadButton = fileUploadModal.querySelector('.modal-btn-primary');
    const closeButtons = fileUploadModal.querySelectorAll('[data-modal-close="true"]');
    const errorDiv = document.getElementById('fileInputError');

    // Variables para manejar el estado
    let selectedFiles = [];

    // Configurar eventos para cerrar modal
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            fileUploadModal.classList.add('hidden');
            resetUploadForm();
        });
    });

    // Cerrar modal al hacer clic fuera
    fileUploadModal.addEventListener('click', (e) => {
        if (e.target === fileUploadModal) {
            fileUploadModal.classList.add('hidden');
            resetUploadForm();
        }
    });

    // Configurar eventos de arrastrar y soltar
    if (fileDropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            fileDropArea.classList.add('border-cyan-500');
        }

        function unhighlight() {
            fileDropArea.classList.remove('border-cyan-500');
        }

        // Manejar archivos soltados
        fileDropArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (fileInput) {
                // Crear un DataTransfer para simular el cambio en el input
                const dataTransfer = new DataTransfer();

                // Añadir los archivos soltados
                for (let i = 0; i < files.length; i++) {
                    dataTransfer.items.add(files[i]);
                }

                // Asignar los archivos al input
                fileInput.files = dataTransfer.files;

                // Disparar evento change para actualizar vista previa
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        }
    }

    // Configurar enlace de navegación
    if (browseLink && fileInput) {
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
    }

    // Configurar vista previa de archivos
    if (fileInput && filePreview) {
        fileInput.addEventListener('change', () => {
            selectedFiles = Array.from(fileInput.files);
            updateFilePreview();
        });
    }

    // Configurar botón de carga
    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
            if (!validateFiles()) {
                return;
            }

            try {
                const formData = new FormData();

                // Agregar todos los archivos al FormData
                selectedFiles.forEach(file => {
                    formData.append('files', file);
                });

                // Mostrar mensaje de carga
                uploadButton.disabled = true;
                uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

                // Simular subida por ahora (implementar RPC real en producción)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Cerrar modal y reiniciar formulario
                fileUploadModal.classList.add('hidden');
                resetUploadForm();

                // Recargar la lista para mostrar los nuevos elementos
                reloadReceptionListPage();

            } catch (error) {
                console.error('Error uploading files:', error);
                if (errorDiv) {
                    errorDiv.textContent = 'Error uploading files. Please try again.';
                    errorDiv.classList.remove('invisible');
                }
            } finally {
                uploadButton.disabled = false;
                uploadButton.innerHTML = '<i class="fas fa-save"></i> Upload';
            }
        });
    }

    // Función para actualizar la vista previa de archivos
    function updateFilePreview() {
        if (!filePreview) return;

        // Limpiar vista previa anterior
        filePreview.innerHTML = '';

        // Crear elementos para cada archivo
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item flex items-center justify-between w-full p-2 mb-2 rounded-md border border-gray-300 dark:border-gray-700';

            // Icono según tipo de archivo
            let fileIcon = 'fa-file';
            if (file.type.startsWith('image/')) fileIcon = 'fa-file-image';
            else if (file.type === 'application/pdf') fileIcon = 'fa-file-pdf';
            else if (file.type.includes('spreadsheet') || file.type.includes('excel')) fileIcon = 'fa-file-excel';
            else if (file.type.includes('document') || file.type.includes('word')) fileIcon = 'fa-file-word';

            // Nombre y tamaño del archivo
            const fileSize = formatFileSize(file.size);

            fileItem.innerHTML = `
                <div class="flex items-center">
                    <i class="fas ${fileIcon} text-gray-500 mr-2"></i>
                    <span class="text-sm">${file.name} <span class="text-xs text-gray-400">(${fileSize})</span></span>
                </div>
                <button type="button" class="delete-file-btn text-gray-500 hover:text-red-500" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            filePreview.appendChild(fileItem);

            // Configurar botón de eliminar
            const deleteBtn = fileItem.querySelector('.delete-file-btn');
            deleteBtn.addEventListener('click', () => {
                selectedFiles = selectedFiles.filter((_, i) => i !== index);
                updateFilePreview();
            });
        });

        // Ocultar mensaje de error
        if (errorDiv) {
            errorDiv.classList.add('invisible');
        }
    }

    // Función para formatear el tamaño del archivo
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Función para validar los archivos
    function validateFiles() {
        if (!errorDiv) return true;

        // Verificar que se haya seleccionado al menos un archivo
        if (selectedFiles.length === 0) {
            errorDiv.textContent = 'Please select at least one file to upload.';
            errorDiv.classList.remove('invisible');
            return false;
        }

        // Verificar tamaño máximo (5MB por archivo)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        const oversizedFiles = selectedFiles.filter(file => file.size > maxSize);

        if (oversizedFiles.length > 0) {
            errorDiv.textContent = `Some files exceed the maximum size of 5MB.`;
            errorDiv.classList.remove('invisible');
            return false;
        }

        return true;
    }

    // Función para resetear el formulario
    function resetUploadForm() {
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.innerHTML = '';
        if (errorDiv) errorDiv.classList.add('invisible');
        selectedFiles = [];
    }
};