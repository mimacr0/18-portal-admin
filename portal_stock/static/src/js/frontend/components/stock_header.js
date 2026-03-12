/**
 * Sticky table header implementation for stock management
 * @param {string} tableSelector - Optional CSS selector for the table (default: auto-detect)
 */
export function initStickyTableHeader(tableSelector = null) {
    // Auto-detect table if no selector provided
    const selectors = tableSelector 
        ? [tableSelector]
        : ['#page-stock-list-table', '#page-lots-list-table'];
    
    let stockTable = null;
    for (const sel of selectors) {
        stockTable = document.querySelector(sel);
        if (stockTable) break;
    }
    
    if (!stockTable) {
        // Silently return if no table found - this is expected on other pages
        return;
    }

    const listTableHeader = stockTable.querySelector('thead');
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
    }

    function removeFixedHeader() {
        if (!isFixed) return;

        if (tmpHeaderTable && document.body.contains(tmpHeaderTable)) {
            document.body.removeChild(tmpHeaderTable);
            tmpHeaderTable = null;
        }

        isFixed = false;
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

    // Start observing the header
    headerObserver.observe(listTableHeader);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (isFixed && tmpHeaderTable) {
            tmpHeaderTable.style.left = parentTable.getBoundingClientRect().left + 'px';
            tmpHeaderTable.style.width = parentTable.getBoundingClientRect().width + 'px';

            // Re-apply cell widths
            const cellStyles = captureStyles();
            const headerCells = tmpHeaderTable.querySelectorAll('th');
            headerCells.forEach((cell, index) => {
                if (cellStyles[index]) {
                    cell.style.width = cellStyles[index].width + 'px';
                }
            });
        }
    });

    // Handle dark mode changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' &&
                mutation.target === document.documentElement &&
                isFixed && tmpHeaderTable) {

                // Update styles for dark mode
                const headerCells = tmpHeaderTable.querySelectorAll('th');
                const cellStyles = captureStyles();
                headerCells.forEach((cell, index) => {
                    if (cellStyles[index]) {
                        cell.style.backgroundColor = cellStyles[index].backgroundColor;
                        cell.style.color = cellStyles[index].color;
                    }
                });
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });
}
