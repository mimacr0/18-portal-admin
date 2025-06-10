
// Add a ripple effect for button clicks (demo buttons only)
const addButtonClickEffect = (button) => {
    return function(event) {
        // Add a ripple effect
        const ripple = document.createElement('span');
        ripple.classList.add('ripple-effect');
        button.appendChild(ripple);

        // Set position and animate
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size/2}px`;
        ripple.style.top = `${event.clientY - rect.top - size/2}px`;

        // Remove after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 600);
    };
};
