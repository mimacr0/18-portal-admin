import { reloadExpeditionListPage } from './expedition_list.js';

/**
 * Inicializa los filtros rápidos de tipo para la página de recepciones.
 *
 * Esta función configura los eventos de clic en los botones de filtrado rápido
 * y maneja la actualización de la lista según el filtro seleccionado.
 */
export const initExpeditionQuickSortFilters = () => {
    // Botones de filtro
   // --- 1. Crear diccionario filterValue → botón ---
    const filterButtons = {
        all: document.getElementById('page-expedition-list-filter-all'),
        draft: document.getElementById('page-expedition-list-filter-draft'),
        billing: document.getElementById('page-expedition-list-filter-billing'),
        preparing: document.getElementById('page-expedition-list-filter-preparing'),
        to_be_shipped: document.getElementById('page-expedition-list-filter-to-be-shipped'),
        shipped: document.getElementById('page-expedition-list-filter-shipped'),
        cancel: document.getElementById('page-expedition-list-filter-cancel')
    };
    // Input oculto para almacenar el filtro activo
    const activeFilterInput = document.getElementById('page-expedition-list-quick-filter-active');
    if (!activeFilterInput) return;

    // --- 2. Si ninguno de los botones existe, salir ---
    if (!Object.values(filterButtons).some(btn => btn)) return;

    // --- 3. Configurar listeners de forma genérica ---
    Object.entries(filterButtons).forEach(([filterValue, button]) => {
        if (!button) return; // ignorar si no existe

        button.addEventListener('click', () => {
            // Todos los demás botones inactivos
            const inactiveButtons = Object.values(filterButtons).filter(btn => btn && btn !== button);

            // Llamada a tu función genérica
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
        const currentPageInput = document.getElementById('expedition-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con el nuevo filtro
        reloadExpeditionListPage();
    };
};