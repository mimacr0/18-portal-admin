import { reloadRepairAlertListPage } from './repair_alert_list.js';

/**
 * Inicializa los filtros rápidos de tipo para la página de recepciones.
 *
 * Esta función configura los eventos de clic en los botones de filtrado rápido
 * y maneja la actualización de la lista según el filtro seleccionado.
 */
export const initRepairAlertQuickSortFilters = () => {
    // // Botones de filtro
    const filterButtons = {
        all: document.getElementById('page-repair-alert-list-filter-all'),
        active: document.getElementById('page-repair-alert-list-filter-active'),
        in_transit: document.getElementById('page-repair-alert-list-filter-in_transit'),
        in_warehouse: document.getElementById('page-repair-alert-list-filter-in_warehouse'),
        sent_to_repair: document.getElementById('page-repair-alert-list-filter-sent_to_repair'),
        repairing: document.getElementById('page-repair-alert-list-filter-repairing'),
        return_after_sales: document.getElementById('page-repair-alert-list-filter-return_after_sales'),
        sent_to_client: document.getElementById('page-repair-alert-list-filter-sent_to_client'),
        sent_to_recycling: document.getElementById('page-repair-alert-list-filter-sent_to_recycling'),
        cancelled: document.getElementById('page-repair-alert-list-filter-cancelled')
    };

    // Input oculto para almacenar el filtro activo
    const activeFilterInput = document.getElementById('page-repair-alert-list-quick-filter-active');
    if (!activeFilterInput) return;

    if (!Object.values(filterButtons).some(btn => btn)) return;

    // --- 2. Configurar listeners de forma genérica ---
    Object.entries(filterButtons).forEach(([filterValue, button]) => {
        if (!button) return; // ignorar si no existe

        button.addEventListener('click', () => {
            // Todos los demás botones
            const inactiveButtons = Object.values(filterButtons).filter(btn => btn && btn !== button);
            setActiveFilter(filterValue, button, inactiveButtons);
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
    const setActiveFilter = (filterValue, activeButton, inactiveButtons) => {
        // Actualizar el input con el valor del filtro
        activeFilterInput.value = filterValue;

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
        const currentPageInput = document.getElementById('repair-alert-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con el nuevo filtro
        reloadRepairAlertListPage();
    };
};