/**
 * Formats a number with comma separators and optional prefix/suffix
 * @param {number} number - The number to format
 * @param {string} prefix - Optional prefix (e.g. "$")
 * @param {string} suffix - Optional suffix (e.g. "%")
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {string} thousandSep - Thousand separator character (default: depends on locale)
 * @param {string} decimalSep - Decimal separator character (default: depends on locale)
 * @returns {string} Formatted number
 */
const formatNumber = (number, prefix = '', suffix = '', decimals = 0, thousandSep = undefined, decimalSep = undefined) => {
    // Ensure number is a numeric value
    const value = parseFloat(number) || 0;

    // First format with the specified number of decimal places
    let formatted;

    if (decimals === 0) {
        // Format as integer
        formatted = Math.round(value).toString();
    } else {
        // Format with specified decimal places
        formatted = value.toFixed(decimals);
    }

    // Split into integer and decimal parts
    let [intPart, decPart] = formatted.split('.');

    // Add thousand separators to integer part
    if (thousandSep !== undefined && thousandSep !== '') {
        // Add thousand separators
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    } else if (intPart.length > 3) {
        // Use default locale formatting for thousands
        try {
            intPart = parseInt(intPart).toLocaleString();
        } catch (e) {
            // Fallback if toLocaleString fails
            intPart = intPart;
        }
    }

    // Combine parts with the appropriate decimal separator
    let result;
    if (decimals > 0 && decPart !== undefined) {
        const separator = (decimalSep !== undefined && decimalSep !== '') ? decimalSep : '.';
        result = intPart + separator + (decPart || '0'.repeat(decimals));
    } else {
        result = intPart;
    }

    return `${prefix}${result}${suffix}`;
};

/**
 * Animates a number from current to target value with dynamic step
 * @param {HTMLElement} element - The element to update
 * @param {number} targetValue - The final value to reach
 * @param {number} duration - Animation duration in ms (default: 1000)
 * @param {string} prefix - Optional prefix (e.g. "$")
 * @param {string} suffix - Optional suffix (e.g. "%")
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {string} thousandSep - Thousand separator character (default: depends on locale)
 * @param {string} decimalSep - Decimal separator character (default: depends on locale)
 */
const animateNumber = (element, targetValue, duration = 1000, prefix = '', suffix = '', decimals = 2, thousandSep = undefined, decimalSep = undefined) => {
    if (!element) return;

    // Parse values to ensure they're numbers
    const target = parseFloat(targetValue);

    // Get current displayed value (without formatting)
    const currentValue = parseFloat(element.getAttribute('data-current') || 0);
    const difference = target - currentValue;

    // Skip animation if no change
    if (difference === 0) return;

    // Calculate step size based on difference magnitude
    // Larger differences get larger steps
    const totalSteps = 20;
    const stepDuration = duration / totalSteps;
    const stepSize = difference / totalSteps;

    let currentStep = 0;
    let currentDisplayValue = currentValue;

    const updateStep = () => {
        currentStep++;

        if (currentStep >= totalSteps) {
            // Final step - ensure we hit the exact target
            currentDisplayValue = target;
            element.textContent = formatNumber(currentDisplayValue, prefix, suffix, decimals, thousandSep, decimalSep);
            element.setAttribute('data-current', target);
            return;
        }

        // Update with calculated step
        currentDisplayValue += stepSize;
        element.textContent = formatNumber(currentDisplayValue, prefix, suffix, decimals, thousandSep, decimalSep);

        // Schedule next step
        setTimeout(updateStep, stepDuration);
    };

    // Start animation
    updateStep();
};

/**
 * Updates a number with animation, automatically detecting increment or decrement
 * @param {string} selector - The element selector to update
 * @param {number} newValue - The new value to set
 * @param {number} duration - Animation duration in ms (default: 1000)
 */
const sysToolsUdateNumber = (selector, newValue, duration = 1000) => {
    const element = document.querySelector(selector);
    if (!element) return;

    // Parse the numeric value to ensure it's treated as a number
    const numericValue = parseFloat(newValue || 0);

    const prefix = element.getAttribute('data-prefix') || '';
    const suffix = element.getAttribute('data-suffix') || '';

    // Make sure we parse the decimals attribute correctly as a number
    const decimalsAttr = element.getAttribute('data-decimals');
    // For integer display like counts (receptions, expeditions), use 0 decimals
    // For values like "15" and "2" from the screenshot
    const isCount = selector.includes('total-receptions') || selector.includes('total-expeditions')
                 || selector.includes('total-products') || selector.includes('total-stock');

    const decimals = isCount ? 0 : (decimalsAttr !== null ? parseInt(decimalsAttr, 10) : 2);

    // Get separator attributes using kebab case
    const thousandSep = element.getAttribute('data-thousand-sep');
    const decimalSep = element.getAttribute('data-decimal-sep');

    // Update data-value attribute with the new value
    element.setAttribute('data-value', numericValue);

    // Animate to the new value
    animateNumber(element, numericValue, duration, prefix, suffix, decimals, thousandSep, decimalSep);
};