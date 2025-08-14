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
    const toBeShippedtButton = document.getElementById('page-expedition-list-filter-to-be-shipped');
    const shippedButton = document.getElementById('page-expedition-list-filter-shipped');
    const cancelButton = document.getElementById('page-expedition-list-filter-cancel');

    // Input oculto para almacenar el filtro activo
    const quickFiltersInput = document.getElementById('page-expedition-list-filter-active');

    if (!quickFiltersInput) return;
    if (!allButton && !draftButton && !billingButton && !preparingButton && !toBeShippedtButton && !shippedButton && !cancelButton) return;

    const buttons = {
        all: allButton,
        draft: draftButton,
        billing: billingButton,
        preparing: preparingButton,
        toBeShipped: toBeShippedtButton,
        shipped: shippedButton,
        cancel: cancelButton
    };

    const buttonEntries = Object.entries(buttons).filter(([_, btn]) => btn);

    if (buttonEntries.length === 0) return;

    buttonEntries.forEach(([key, button]) => {
        button.addEventListener('click', () => {
            const otherButtons = buttonEntries
                .filter(([k, _]) => k !== key)
                .map(([_, b]) => b);
            setQuickFilter(key, button, otherButtons);
        });
    });

    /**
     * Establece un filtro como activo, actualiza las clases CSS de los botones
     * y recarga la lista con el nuevo filtro
     *
     * @param {string} filterValue - Valor del filtro ('all', 'pending', 'done')
     * @param {Element} activeButton - Botón del filtro que se activa
     * @param {Element[]} inactiveButtons - Botones que deben desactivarse
     */
    const setQuickFilter = (filterValue, activeButton, inactiveButtons) => {
        // Actualizar el input con el valor del filtro
        quickFiltersInput.value = filterValue;
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
        const currentPageInput = document.getElementById('page-expedition-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con el nuevo filtro
        reloadExpeditionListPage();
    };
};