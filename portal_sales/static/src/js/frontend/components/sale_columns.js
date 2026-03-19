/**
 * Sale Column Selector Component
 * Handles dynamic visibility of table columns with localStorage persistence.
 */

const STORAGE_KEY = 'portal_sale_visible_columns';

/**
 * Gets the current visibility settings from localStorage.
 * @returns {Object|null}
 */
const getSavedVisibility = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error('Error reading column visibility from localStorage', e);
        return null;
    }
};

/**
 * Saves the current visibility settings to localStorage.
 * @param {Object} visibility 
 */
const saveVisibility = (visibility) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
};

/**
 * Applies visibility to all elements with data-column-id.
 * @param {Object} visibility 
 */
export const applySaleColumnVisibility = (visibility = null) => {
    const settings = visibility || getSavedVisibility();
    if (!settings) return;

    Object.keys(settings).forEach(colId => {
        const isVisible = settings[colId];
        const elements = document.querySelectorAll(`[data-column-id="${colId}"]`);
        elements.forEach(el => {
            if (isVisible) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        // Sync checkbox if it exists
        const checkbox = document.querySelector(`.sale-column-toggle[data-column-id="${colId}"]`);
        if (checkbox) {
            checkbox.checked = isVisible;
        }
    });
};

/**
 * Initializes the column selector component for sales.
 */
export const initSaleColumnSelector = () => {
    const btn = document.getElementById('sale-columns-selector-btn');
    const dropdown = document.getElementById('sale-columns-dropdown');
    const container = document.getElementById('sale-columns-selector-container');

    if (!btn || !dropdown) return;

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Handle toggle checkboxes
    const toggles = document.querySelectorAll('.sale-column-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const colId = e.target.dataset.columnId;
            const isVisible = e.target.checked;

            const currentSettings = getSavedVisibility() || {};
            currentSettings[colId] = isVisible;
            saveVisibility(currentSettings);

            applySaleColumnVisibility(currentSettings);
        });
    });

    // Apply initial visibility on load
    applySaleColumnVisibility();
};
