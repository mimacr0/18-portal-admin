import { reloadSaleListPage } from './sale_list.js';

/**
 * Inicializa los filtros rápidos de tipo para la página de recepciones.
 *
 * Esta función configura los eventos de clic en los botones de filtrado rápido
 * y maneja la actualización de la lista según el filtro seleccionado.
 */
export const initSaleQuickSortFilters = () => {
    // Input oculto para almacenar el filtro activo
    const activeFilterInput = document.getElementById('page-sale-list-quick-filter-active');
    if (!activeFilterInput) return;

    // Obtener todos los botones de filtro que sigan el patrón de ID
    const filterButtons = document.querySelectorAll('[id^="page-sale-list-filter-"]');
    if (!filterButtons || filterButtons.length === 0) return;

    // Añadir listener a cada botón
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Extraer el ID del filtro del ID del botón
            const filterId = button.id.replace('page-sale-list-filter-', '');
            
            // Actualizar el input con el valor del filtro
            activeFilterInput.value = filterId;

            // Actualizar clases CSS de todos los botones de filtro
            filterButtons.forEach(btn => {
                if (btn === button) {
                    btn.classList.add('active', 'border-primary-theme', 'text-primary-theme');
                    btn.classList.remove('border-transparent', 'text-gray-500');
                } else {
                    btn.classList.remove('active', 'border-primary-theme', 'text-primary-theme');
                    btn.classList.add('border-transparent', 'text-gray-500');
                }
            });

            // Resetear la página actual
            const currentPageInput = document.getElementById('page-sale-list-pagination-page');
            if (currentPageInput) currentPageInput.value = 1;

            // Recargar la lista con el nuevo filtro
            reloadSaleListPage();
        });
    });
};