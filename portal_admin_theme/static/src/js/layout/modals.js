// Simple modal functions
const Modal = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.setAttribute('data-open', 'true');
            document.body.classList.add('modal-open');

            // Dispatch a custom event when a modal is opened
            const modalOpenedEvent = new CustomEvent('modalOpened', {
                detail: { modalId: modalId, modal: modal }
            });
            document.dispatchEvent(modalOpenedEvent);
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.setAttribute('data-open', 'false');
            document.body.classList.remove('modal-open');

            // Dispatch a custom event when a modal is closed
            const modalClosedEvent = new CustomEvent('modalClosed', {
                detail: { modalId: modalId, modal: modal }
            });
            document.dispatchEvent(modalClosedEvent);
        }
    },

    toggle(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const isOpen = modal.getAttribute('data-open') === 'true';
            this[isOpen ? 'close' : 'open'](modalId);
        }
    },

    init() {
        // Handle modal triggers
        document.addEventListener('click', (e) => {
            // Open modal
            const openTrigger = e.target.closest('[data-modal-open]');
            if (openTrigger) {
                const modalId = openTrigger.getAttribute('data-modal-open');
                this.open(modalId);
            }

            // Close modal
            const closeTrigger = e.target.closest('[data-modal-close]');
            if (closeTrigger) {
                const modal = closeTrigger.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                }
            }

            // Handle outside clicks
            if (e.target.classList.contains('modal')) {
                const modal = e.target;
                const outsideClose = modal.getAttribute('data-outside-close') !== 'false';
                if (outsideClose) {
                    this.close(modal.id);
                } else {
                    // Apply effects when clicking outside a non-closable modal
                    const modalContent = modal.querySelector('.modal-content');
                    const closeButton = modal.querySelector('.close-modal');

                    // Remove any existing effect classes
                    modalContent.classList.remove('modal-shake-effect', 'modal-upscale-effect', 'modal-pulse-border');

                    // Add visual feedback - tiny upscale effect instead of shake
                    modalContent.classList.add('modal-upscale-effect');

                    // Add flash overlay effect
                    const overlay = document.createElement('div');
                    overlay.classList.add('modal-flash-overlay');
                    modalContent.appendChild(overlay);

                    // Highlight the close button
                    if (closeButton) {
                        closeButton.classList.add('modal-pulse-close-button');
                        setTimeout(() => {
                            closeButton.classList.remove('modal-pulse-close-button');
                        }, 1500);
                    }

                    // Remove the effect classes after animation completes
                    setTimeout(() => {
                        modalContent.classList.remove('modal-upscale-effect');
                        if (overlay && overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, 1000);
                }
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[data-open="true"]');
                if (openModal && openModal.getAttribute('data-outside-close') !== 'false') {
                    this.close(openModal.id);
                }
            }
        });
    }
};

// Initialize modals when DOM is loaded
document.addEventListener('DOMContentLoaded', () => Modal.init());

// Export modal functions for global use
window.Modal = Modal;
