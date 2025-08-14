/**
 * Inicializa el encabezado de tabla pegajoso (sticky) para la lista de recepciones.
 *
 * Esta función hace que el encabezado de la tabla permanezca visible en la parte superior
 * de la ventana mientras el usuario desplaza la página hacia abajo, mejorando la usabilidad
 * especialmente en listas largas.
 */
export function initStickyTableHeader() {
    console.log("Initializing sticky table header");

    // Find the expedition table that contains the expedition-page-list-items tbody
    const expeditionTable = document.querySelector('#page-expedition-list-table');
    if (!expeditionTable) {
        console.error("expedition table not found");
        return;
    }

    const listTableHeader = expeditionTable.querySelector('thead');
    if (!listTableHeader) {
        console.error("List table header not found");
        return;
    }

    // Get the parent table to reference for width
    const parentTable = listTableHeader.closest('table');
    if (!parentTable) {
        console.error("Parent table not found");
        return;
    }

    // Set a flag to track if we're in fixed mode
    let isFixed = false;
    let tmpHeaderTable = null;

    // Function to get exact computed styles for each header cell
    function captureStyles() {
        const headerCells = listTableHeader.querySelectorAll('th');
        return Array.from(headerCells).map(cell => {
            const style = window.getComputedStyle(cell);
            const rect = cell.getBoundingClientRect();
            return {
                width: rect.width,
                paddingLeft: style.paddingLeft,
                paddingRight: style.paddingRight,
                textAlign: style.textAlign,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: style.color,
                backgroundColor: style.backgroundColor
            };
        });
    }

    function createFixedHeader() {
        if (isFixed) return; // Prevent duplicate creation

        const skipStickyHeader = document.getElementById('skip-list-page-sticky-header').value;

        if(skipStickyHeader == 'true') return;

        // Capture exact styles before creating clone
        const cellStyles = captureStyles();

        // Create table for fixed header
        tmpHeaderTable = document.createElement('table');
        tmpHeaderTable.classList.remove('min-w-full');
        tmpHeaderTable.style.position = 'fixed';
        tmpHeaderTable.style.top = '60px';
        tmpHeaderTable.style.left = parentTable.getBoundingClientRect().left + 'px';
        tmpHeaderTable.style.width = parentTable.getBoundingClientRect().width + 'px';
        tmpHeaderTable.style.zIndex = '100';
        tmpHeaderTable.style.backgroundColor = window.getComputedStyle(listTableHeader).backgroundColor || 'white';
        tmpHeaderTable.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';

        // Clone header
        const clonedHeader = listTableHeader.cloneNode(true);

        // Hide all checkboxes in the cloned header
        const checkboxes = clonedHeader.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.style.display = 'none';
        });

        // Hide all icons in the cloned header
        const icons = clonedHeader.querySelectorAll('i');
        icons.forEach(icon => {
            icon.style.display = 'none';
        });

        // Apply styles to each cell in clone
        const clonedCells = clonedHeader.querySelectorAll('th');
        clonedCells.forEach((cell, index) => {
            if (cellStyles[index]) {
                const style = cellStyles[index];
                cell.style.width = style.width + 'px';
                cell.style.minWidth = style.width + 'px';
                cell.style.maxWidth = style.width + 'px';
                cell.style.paddingLeft = style.paddingLeft;
                cell.style.paddingRight = style.paddingRight;
                cell.style.textAlign = style.textAlign;
                cell.style.fontWeight = style.fontWeight;
                cell.style.fontSize = style.fontSize;
                cell.style.color = style.color;
                cell.style.backgroundColor = style.backgroundColor;
            }
        });

        tmpHeaderTable.appendChild(clonedHeader);
        document.body.appendChild(tmpHeaderTable);
        isFixed = true;
        console.log("Fixed header created and displayed");
    }

    function removeFixedHeader() {
        if (!isFixed) return;

        if (tmpHeaderTable && document.body.contains(tmpHeaderTable)) {
            document.body.removeChild(tmpHeaderTable);
            tmpHeaderTable = null;
        }

        isFixed = false;
        console.log("Fixed header removed");
    }

    // Create IntersectionObserver to monitor header visibility
    const headerObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];

        if (!entry.isIntersecting && !isFixed) {
            createFixedHeader();
        } else if (entry.isIntersecting && isFixed) {
            removeFixedHeader();
        }
    }, {
        threshold: 0,
        rootMargin: "-10px 0px 0px 0px" // Trigger when header is 10px out of viewport

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