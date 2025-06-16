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
    const pendingButton = document.getElementById('page-expedition-list-filter-pending');
    const doneButton = document.getElementById('page-expedition-list-filter-done');

    // Input oculto para almacenar el filtro activo
    const activeFilterInput = document.getElementById('page-expedition-list-filter-active');

    if (!activeFilterInput) return;
    if (!allButton && !pendingButton && !doneButton) return;

    // Manejar click en botón "All"
    if (allButton) {
        allButton.addEventListener('click', () => {
            setActiveFilter('all', allButton, [pendingButton, doneButton]);
        });
    }

    // Manejar click en botón "Pending"
    if (pendingButton) {
        pendingButton.addEventListener('click', () => {
            setActiveFilter('pending', pendingButton, [allButton, doneButton]);
        });
    }

    // Manejar click en botón "Done"
    if (doneButton) {
        doneButton.addEventListener('click', () => {
            setActiveFilter('done', doneButton, [allButton, pendingButton]);
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

        // Agregar clases para estilo activo
        activeButton.classList.add('active', 'border-cyan-500', 'text-cyan-600');
        activeButton.classList.remove('border-transparent', 'text-gray-500');

        // Quitar clases de estilo activo a los otros botones
        inactiveButtons.forEach(button => {
            if (!button) return;
            button.classList.remove('active', 'border-cyan-500', 'text-cyan-600');
            button.classList.add('border-transparent', 'text-gray-500');
        });

        // Resetear la página actual
        const currentPageInput = document.getElementById('expedition-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con el nuevo filtro
        reloadExpeditionListPage();
    };
};