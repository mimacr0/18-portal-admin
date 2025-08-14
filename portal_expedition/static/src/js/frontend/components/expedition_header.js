/**
 * Inicializa el encabezado de tabla pegajoso (sticky) para la lista de recepciones.
 *
 * Esta función hace que el encabezado de la tabla permanezca visible en la parte superior
 * de la ventana mientras el usuario desplaza la página hacia abajo, mejorando la usabilidad
 * especialmente en listas largas.
 */
export const initStickyTableHeader = () => {
    // Obtener el encabezado de la tabla y la tabla completa
    const tableHeader = document.querySelector('.min-w-full thead');
    const table = document.querySelector('.min-w-full');

    if (!tableHeader || !table) return;

    // Obtener la posición inicial del encabezado relativa al documento
    const tableHeaderTop = tableHeader.getBoundingClientRect().top + window.scrollY;
    const tableHeaderHeight = tableHeader.offsetHeight;
    const tableWidth = table.offsetWidth;

    // Clonar el encabezado para usarlo como elemento pegajoso
    const stickyHeader = tableHeader.cloneNode(true);
    stickyHeader.classList.add('sticky-header');

    // Estilos para el encabezado pegajoso
    Object.assign(stickyHeader.style, {
        position: 'fixed',
        top: '0',
        zIndex: '50',
        opacity: '0',
        visibility: 'hidden',
        width: `${tableWidth}px`,
        backgroundColor: 'var(--bg-table-header, #f9fafb)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'opacity 0.3s'
    });

    // Insertar el encabezado pegajoso en el DOM
    document.body.appendChild(stickyHeader);

    // Manejar el evento de desplazamiento
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Verificar si debemos mostrar el encabezado pegajoso
        if (scrollY > tableHeaderTop) {
            stickyHeader.style.opacity = '1';
            stickyHeader.style.visibility = 'visible';
        } else {
            stickyHeader.style.opacity = '0';
            stickyHeader.style.visibility = 'hidden';
        }
    });

    // Manejar el evento de cambio de tamaño de ventana
    window.addEventListener('resize', () => {
        // Actualizar el ancho del encabezado pegajoso
        stickyHeader.style.width = `${table.offsetWidth}px`;
    });

    // Cleanup function
    return () => {
        document.body.removeChild(stickyHeader);
        window.removeEventListener('scroll', () => {});
        window.removeEventListener('resize', () => {});
    };
};