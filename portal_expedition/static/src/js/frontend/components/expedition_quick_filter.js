import { reloadExpeditionListPage } from './expedition_list.js';

/**
 * Inicializa los filtros rápidos de tipo para la página de recepciones.
 *
 * Esta función configura los eventos de clic en los botones de filtrado rápido
 * y maneja la actualización de la lista según el filtro seleccionado.
 */
export const initExpeditionQuickSortFilters = () => {
    // Botones de filtro
    const allButton = document.getElementById('page-expedition-list-filter-all');
    const draftButton = document.getElementById('page-expedition-list-filter-draft');
    const billingButton = document.getElementById('page-expedition-list-filter-billing');
    const preparingButton = document.getElementById('page-expedition-list-filter-preparing');
    const toBeShippedButton = document.getElementById('page-expedition-list-filter-to-be-shipped');
    const shippedButton = document.getElementById('page-expedition-list-filter-shipped');
    const cancelButton = document.getElementById('page-expedition-list-filter-cancel');
    const quickFiltersInput = document.getElementById('page-expedition-list-filter-active');

    if (!quickFiltersInput) return;
    if (!allButton && !draftButton && !billingButton && !preparingButton && !toBeShippedButton && !shippedButton && !cancelButton) return;

    if (allButton) {
    allButton.addEventListener('click', () => {
            setActiveFilter('all', allButton, [draftButton, billingButton, preparingButton, toBeShippedButton, shippedButton, cancelButton]);
        });
    }

    if (draftButton) {
        draftButton.addEventListener('click', () => {
            setActiveFilter('draft', draftButton, [allButton, billingButton, preparingButton, toBeShippedButton, shippedButton, cancelButton]);
        });
    }

    if (billingButton) {
        billingButton.addEventListener('click', () => {
            setActiveFilter('billing', billingButton, [allButton, draftButton, preparingButton, toBeShippedButton, shippedButton, cancelButton]);
        });
    }

    if (preparingButton) {
        preparingButton.addEventListener('click', () => {
            setActiveFilter('preparing', preparingButton, [allButton, draftButton, billingButton, toBeShippedButton, shippedButton, cancelButton]);
        });
    }

    if (toBeShippedButton) {
        toBeShippedButton.addEventListener('click', () => {
            setActiveFilter('toBeShipped', toBeShippedButton, [allButton, draftButton, billingButton, preparingButton, shippedButton, cancelButton]);
        });
    }

    if (shippedButton) {
        shippedButton.addEventListener('click', () => {
            setActiveFilter('shipped', shippedButton, [allButton, draftButton, billingButton, preparingButton, toBeShippedButton, cancelButton]);
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            setActiveFilter('cancel', cancelButton, [allButton, draftButton, billingButton, preparingButton, toBeShippedButton, shippedButton]);
        });
    }


    /**
     * Establece un filtro como activo, actualiza las clases CSS de los botones
     * y recarga la lista con el nuevo filtro
     *
     * @param {string} filterValue - Valor del filtro ('all', 'pending', 'done')
     * @param {Element} activeButton - Botón del filtro que se activa
     * @param {Element[]} inactiveButtons - Botones que deben desactivarse
     */
    const setActiveFilter = (filterValue, activeButton, inactiveButtons) => {
        // Actualizar el input con el valor del filtro
        activeFilterInput.value = filterValue;
        console.log('Active filter set to:', activeButton);
        // Agregar clases para estilo activo
        activeButton.classList.add('active', 'border-[#8A8A00]', 'text-[#696900]');
        activeButton.classList.remove('border-transparent', 'text-gray-500');

        // Quitar clases de estilo activo a los otros botones
        inactiveButtons.forEach(button => {
            if (!button) return;
            button.classList.remove('active', 'border-[#8A8A00]', 'text-[#696900]');
            button.classList.add('border-transparent', 'text-gray-500');
        });

        // Resetear la página actual
        const currentPageInput = document.getElementById('expedition-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con el nuevo filtro
        reloadExpeditionListPage();
    };
};