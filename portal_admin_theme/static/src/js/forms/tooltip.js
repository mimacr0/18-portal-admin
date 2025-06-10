document.addEventListener('DOMContentLoaded', function() {
  // Create a container for all tooltips to avoid z-index issues
  const tooltipContainer = document.createElement('div');
  tooltipContainer.id = 'tooltip-container';
  tooltipContainer.style.cssText = 'position: fixed; z-index: 99999; pointer-events: none; top: 0; left: 0; width: 100%; height: 100%;';
  document.body.appendChild(tooltipContainer);

  let activeTooltip = null;
  let hoverTimer = null;

  // Find all help icons and set up tooltips
  document.querySelectorAll('.help-icon').forEach(icon => {
    // Get the tooltip content
    const originalTooltip = icon.nextElementSibling;
    const tooltipContent = originalTooltip ? originalTooltip.innerHTML : 'Help information';

    // Hide the original tooltip completely
    if (originalTooltip) {
      originalTooltip.style.display = 'none';
    }

    // Show tooltip on mouseenter
    icon.addEventListener('mouseenter', function() {
      // Clear any existing hide timer
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }

      // If a tooltip is already open, remove it
      if (activeTooltip) {
        tooltipContainer.removeChild(activeTooltip);
        activeTooltip = null;
      }

      // Create and position a new tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';
      tooltip.innerHTML = tooltipContent;

      // Position tooltip above the icon
      const iconRect = icon.getBoundingClientRect();

      // Check if dark mode is active
      const isDarkMode = document.documentElement.classList.contains('dark');
      const bgColor = isDarkMode ? '#0f172a' : '#1f2937';
      const textColor = isDarkMode ? '#ffffff' : 'white';
      const borderStyle = isDarkMode ? '1px solid #334155' : 'none';
      const boxShadow = isDarkMode ? '0 8px 16px rgba(0, 0, 0, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)';

      tooltip.style.cssText = `
        position: absolute;
        background-color: ${bgColor};
        color: ${textColor};
        padding: 8px 10px;
        border-radius: 4px;
        border: ${borderStyle};
        font-size: 10px;
        line-height: 1.2;
        max-width: 200px;
        box-shadow: ${boxShadow};
        pointer-events: none;
        bottom: ${window.innerHeight - iconRect.top + 10}px;
        left: ${iconRect.left}px;
        transform: translateX(-90%);
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      // Add arrow
      const arrow = document.createElement('div');
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid ${bgColor};
        bottom: -5px;
        left: 85%;
      `;
      tooltip.appendChild(arrow);

      // Add to container
      tooltipContainer.appendChild(tooltip);
      activeTooltip = tooltip;

      // Adjust position if too close to edge
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.left < 10) {
        tooltip.style.left = '10px';
        tooltip.style.transform = 'none';
        arrow.style.left = `${iconRect.left - 10 + 5}px`;
      }
      if (tooltipRect.right > window.innerWidth - 10) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '10px';
        tooltip.style.transform = 'none';
        arrow.style.left = `${iconRect.left - (window.innerWidth - tooltipRect.width - 10) - 5}px`;
      }

      // Fade in the tooltip
      setTimeout(() => {
        tooltip.style.opacity = '1';
      }, 10);
    });

    // Hide tooltip on mouseleave with a small delay
    icon.addEventListener('mouseleave', function() {
      if (activeTooltip) {
        activeTooltip.style.opacity = '0';

        // Remove after transition completes
        hoverTimer = setTimeout(() => {
          if (activeTooltip && activeTooltip.parentNode === tooltipContainer) {
            tooltipContainer.removeChild(activeTooltip);
            activeTooltip = null;
          }
        }, 200);
      }
    });
  });

  // Close tooltip when clicking anywhere else
  document.addEventListener('click', function() {
    if (activeTooltip) {
      tooltipContainer.removeChild(activeTooltip);
      activeTooltip = null;
    }
  });

  // Prevent tooltip close when clicking on tooltip
  tooltipContainer.addEventListener('click', function(e) {
    e.stopPropagation();
  });
});
