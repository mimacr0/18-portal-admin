// Funciones de utilidad general

// Implementación de debounce para controlar la frecuencia de búsqueda
export function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Format file size helper
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper para obtener el nombre de columna por índice
export function getColumnNameByIndex(index) {
    // Adjust index if select-all checkbox is present
    const hasBatchActions = document.getElementById('page-products-list-select-all-checkbox') !== null;
    if (hasBatchActions) index--;

    const columns = ['name', 'sku', 'barcode', 'status', 'actions'];
    return index >= 0 && index < columns.length ? columns[index] : null;
}
