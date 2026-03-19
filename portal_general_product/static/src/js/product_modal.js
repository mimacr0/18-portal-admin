import { rpc } from "@portal_admin_theme/network/rpc";
import { _t } from "@web/core/l10n/translation";

// Utilidades
const getElement = (id) => document.getElementById(id);
const PAGE_NAME = 'product_mapping';

/**
 * Recolecta los datos del formulario de edición y los envía al servidor.
 * @async
 */
export const ProductEditSave = async () => {
    try {
        if (window.showLoadingScreen) window.showLoadingScreen();
        
        const formId = `#page-${PAGE_NAME}-edit-form`;
        const { formData } = sysCollectFormData(formId);
        
        const response = await rpc('/account/stock/update/product', formData);
        
        if (window.systemShowNotification) {
            systemShowNotification(response.message || _t('Saved'), { 
                type: response.status === 'success' ? 'success' : 'error', 
                duration: 4000 
            });
        }

        if (response.status === 'success') {
            if (window.Modal) window.Modal.close(`page-${PAGE_NAME}-edit-modal`);
            document.dispatchEvent(new CustomEvent('list:reload'));
        }
    } catch (error) {
        console.error('Error al guardar producto:', error);
        if (window.systemShowNotification) {
            systemShowNotification(_t('Error al guardar el producto'), { 
                type: 'error', 
                duration: 4000 
            });
        }
    } finally {
        if (window.hideLoadingScreen) window.hideLoadingScreen();
    }
};

/**
 * Inicializa los eventos del modal de edición.
 */
export const initProductEditModal = () => {
    const submit = getElement(`page-${PAGE_NAME}-edit-form-submit`);
    if (submit) {
        submit.onclick = ProductEditSave;
    }

    // Manejo de imagen si existe
    const imageInput = getElement(`page-${PAGE_NAME}-edit-form-image`);
    const imagePreview = getElement(`page-${PAGE_NAME}-edit-form-image-preview`);
    const imageDelete = getElement(`page-${PAGE_NAME}-edit-form-image-delete`);
    const imageBase64 = getElement(`page-${PAGE_NAME}-edit-form-image-base64`);

    if (imageInput && imagePreview && imageBase64) {
        imageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                    imageBase64.value = event.target.result.split(',')[1];
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (imageDelete && imagePreview && imageBase64) {
        imageDelete.onclick = () => {
            imagePreview.src = '/portal_stock/static/img/placeholder.png';
            imageBase64.value = '';
            if (imageInput) imageInput.value = '';
        };
    }
};

/**
 * Rellena el formulario de edición con los datos del producto/mapping.
 * @param {Object} product - Datos del producto
 */
export const fillProductEditForm = (product) => {
    const fields = {
        [`page-${PAGE_NAME}-edit-form-product-id`]: product.id,
        [`page-${PAGE_NAME}-edit-form-name`]: product.name || '',
        [`page-${PAGE_NAME}-edit-form-account-sku`]: product.account_sku || '',
        [`page-${PAGE_NAME}-edit-form-account-ean13`]: product.account_ean13 || '',
        [`page-${PAGE_NAME}-edit-form-account-fnsku`]: product.account_fnsku || '',
        [`page-${PAGE_NAME}-edit-form-account-asin`]: product.account_asin || '',
        [`page-${PAGE_NAME}-edit-form-marketplace`]: product.marketplace || '',
        [`page-${PAGE_NAME}-edit-form-notes`]: product.notes || ''
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = getElement(id);
        if (el) el.value = value;
    }

    // Imagen
    const imagePreview = getElement(`page-${PAGE_NAME}-edit-form-image-preview`);
    const imageBase64 = getElement(`page-${PAGE_NAME}-edit-form-image-base64`);
    if (imagePreview) {
        imagePreview.src = product.image_base64 
            ? `data:image/png;base64,${product.image_base64}` 
            : '/portal_stock/static/img/placeholder.png';
    }
    if (imageBase64) imageBase64.value = product.image_base64 || '';
};

document.addEventListener('DOMContentLoaded', () => {
});
