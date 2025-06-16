import { sortConfig } from './expedition_list.js';
import { reloadExpeditionListPage } from './expedition_list.js';

/**
 * Inicializa la funcionalidad de ordenación en la tabla de recepciones.
 *
 * Esta función añade listeners a los encabezados de la tabla para permitir
 * ordenar por diferentes columnas haciendo clic en ellas.
 */
export const initTableSorting = () => {
    // Obtener encabezados de tabla ordenables
    const sortableHeaders = document.querySelectorAll('th [id^="list-column-expedition-"][id$="-sort-icon"]');

    // Verificar si hay encabezados ordenables
    if (!sortableHeaders || sortableHeaders.length === 0) return;

    // Añadir evento de clic a cada encabezado
    sortableHeaders.forEach(header => {
        // El encabezado es el elemento padre
        const headerCell = header.closest('th');

        if (!headerCell) return;

        // Eliminar eventos existentes para evitar duplicaciones
        const newHeader = headerCell.cloneNode(true);
        headerCell.parentNode.replaceChild(newHeader, headerCell);

        // Añadir evento de clic
        newHeader.addEventListener('click', () => {
            // Extraer el ID de la columna del ID del ícono
            const iconId = newHeader.querySelector('[id^="list-column-expedition-"]').id;
            const match = iconId.match(/list-column-expedition-(.+)-sort-icon/);

            if (!match || !match[1]) return;

            const columnId = match[1];

            // Determinar dirección de ordenamiento
            if (sortConfig.column === columnId) {
                // Cambiar dirección si ya estamos ordenando por esta columna
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Establecer nueva columna y dirección predeterminada
                sortConfig.column = columnId;
                sortConfig.direction = 'asc';
            }

            // Actualizar íconos de ordenamiento
            updateSortIcons();

            // Recargar lista con el nuevo ordenamiento
            reloadReceptionListPage();
        });
    });

    // Función para actualizar los íconos de ordenamiento
    function updateSortIcons() {
        // Quitar clases de todos los íconos
        document.querySelectorAll('[id^="list-column-expedition-"][id$="-sort-icon"]').forEach(icon => {
            icon.className = 'fas fa-sort ml-1 text-gray-400';
        });

        // Actualizar ícono de la columna seleccionada si hay alguna
        if (sortConfig.column) {
            const selectedIcon = document.getElementById(`list-column-expedition-${sortConfig.column}-sort-icon`);
            if (selectedIcon) {
                selectedIcon.className = `fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1 text-cyan-600`;
            }
        }
    }
};