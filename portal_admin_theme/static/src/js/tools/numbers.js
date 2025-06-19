/**
 * Formats a number with comma separators and optional prefix/suffix
 * @param {number} number - The number to format
 * @param {string} prefix - Optional prefix (e.g. "$")
 * @param {string} suffix - Optional suffix (e.g. "%")
 * @returns {string} Formatted number
 */
const formatNumber = (number, prefix = '', suffix = '') => {
    return `${prefix}${number.toLocaleString()}${suffix}`;
};

/**
 * Animates a number from current to target value with dynamic step
 * @param {HTMLElement} element - The element to update
 * @param {number} targetValue - The final value to reach
 * @param {number} duration - Animation duration in ms (default: 1000)
 * @param {string} prefix - Optional prefix (e.g. "$")
 * @param {string} suffix - Optional suffix (e.g. "%")
 */
const animateNumber = (element, targetValue, duration = 1000, prefix = '', suffix = '') => {
    if (!element) return;

    // Get current displayed value (without formatting)
    const currentValue = parseFloat(element.getAttribute('data-current') || 0);
    const difference = targetValue - currentValue;

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
            currentDisplayValue = targetValue;
            element.textContent = formatNumber(currentDisplayValue, prefix, suffix);
            element.setAttribute('data-current', targetValue);
            return;
        }

        // Update with calculated step
        currentDisplayValue += stepSize;
        element.textContent = formatNumber(Math.round(currentDisplayValue), prefix, suffix);

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

    const prefix = element.getAttribute('data-prefix') || '';
    const suffix = element.getAttribute('data-suffix') || '';

    // Update data-value attribute with the new value
    element.setAttribute('data-value', newValue);

    // Animate to the new value
    animateNumber(element, newValue, duration, prefix, suffix);
};