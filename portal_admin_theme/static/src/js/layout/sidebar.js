
const sysInitSidebar = () => {

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const toggleFullIcon = document.getElementById('toggle-full-icon');
    const toggleCollapsedIcon = document.getElementById('toggle-collapsed-icon');
    const contentOverlay = document.querySelector('.content-overlay');
    const mainContent = document.getElementById('main-content');

    // Verificar que los elementos críticos existen
    if (!sidebar || !mainContent) {
        console.warn('Sidebar: Critical elements not found');
        return;
    }

    // Convert sidebar to overlay mode
    sidebar.classList.add('sidebar-overlay');
    mainContent.classList.add('full-width');

    // Initialize theme functionality
    if (window.initThemeToggle) {
        initThemeToggle();
    }

    // Set initial state of toggle button (si existen)
    if (toggleFullIcon) toggleFullIcon.classList.add('hidden');
    if (toggleCollapsedIcon) toggleCollapsedIcon.classList.remove('hidden');
    if (sidebarToggle) sidebarToggle.setAttribute('data-sidebar-state', 'collapsed');

    // Save the collapsed state to localStorage
    localStorage.setItem('sidebarState', 'collapsed');

    // Allow transitions after a small delay (prevents transition on load)
    setTimeout(() => {
        // Replace the init class with the regular collapsed class
        if (sidebar.classList.contains('sidebar-collapsed-init')) {
            sidebar.classList.remove('sidebar-collapsed-init');
            sidebar.classList.add('collapsed');
        }
    }, 100);

    // Toggle sidebar with enhanced animations
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            const currentState = this.getAttribute('data-sidebar-state');

            if (currentState === 'full') {
                // Prepare for collapse animation
                document.body.style.overflow = 'hidden'; // Prevent potential scroll jumps during animation

                // Animate collapse - SLOWER with soft slide
                sidebar.classList.add('collapsed');

                // Hide overlay
                if (contentOverlay) {
                    contentOverlay.classList.remove('active');
                }

                // Change toggle icon with slight delay for visual polish
                setTimeout(() => {
                    if (toggleFullIcon) toggleFullIcon.classList.add('hidden');
                    if (toggleCollapsedIcon) toggleCollapsedIcon.classList.remove('hidden');
                }, 350); // Increased delay for hide effect

                this.setAttribute('data-sidebar-state', 'collapsed');

                localStorage.setItem('sidebarState', 'collapsed');

                // Re-enable scrolling after animation completes
                setTimeout(() => {
                    document.body.style.overflow = '';
                }, 1000);
            } else {
                // Prepare for expand animation
                document.body.style.overflow = 'hidden'; // Prevent potential scroll jumps during animation

                // Show overlay
                if (contentOverlay) {
                    contentOverlay.classList.add('active');
                }

                // Animate expand with soft slide
                sidebar.classList.remove('collapsed');

                // Change toggle icon with slight delay for visual polish
                setTimeout(() => {
                    if (toggleFullIcon) toggleFullIcon.classList.remove('hidden');
                    if (toggleCollapsedIcon) toggleCollapsedIcon.classList.add('hidden');
                }, 250);

                this.setAttribute('data-sidebar-state', 'full');

                localStorage.setItem('sidebarState', 'full');

                // Re-enable scrolling after animation completes
                setTimeout(() => {
                    document.body.style.overflow = '';
                }, 700);
            }
        });
    }

    // Make overlay clickable to close sidebar
    if (contentOverlay) {
        contentOverlay.addEventListener('click', function() {
            if (sidebarToggle.getAttribute('data-sidebar-state') === 'full') {
                // Simulate toggle button click to close sidebar
                sidebarToggle.click();
            }
        });
    }

    // Enhanced submenu toggle with smoother animations
    const menuGroups = document.querySelectorAll('.menu-group');
    menuGroups.forEach(group => {
        const menuButton = group.querySelector('button');
        const submenu = group.querySelector('.submenu');
        const arrow = group.querySelector('.submenu-arrow');

        if (menuButton && submenu && arrow) {
            menuButton.addEventListener('click', function (e) {
                e.preventDefault(); // Prevent default behavior

                // Toggle current submenu with enhanced animation
                if (submenu.classList.contains('submenu-hidden')) {
                    // Opening submenu
                    submenu.classList.remove('submenu-hidden');
                    arrow.classList.add('rotate-90');

                    // Animate opacity for a smoother appearance
                    setTimeout(() => {
                        submenu.style.opacity = '1';
                    }, 100); // Increased delay
                } else {
                    // Closing submenu
                    submenu.style.opacity = '0';
                    arrow.classList.remove('rotate-90');

                    // Allow opacity transition to complete before hiding
                    setTimeout(() => {
                        submenu.classList.add('submenu-hidden');
                    }, 400); // Increased delay
                }

                // Close other submenus with staggered timing for visual polish
                menuGroups.forEach((otherGroup, index) => {
                    if (otherGroup !== group) {
                        const otherSubmenu = otherGroup.querySelector('.submenu');
                        const otherArrow = otherGroup.querySelector('.submenu-arrow');

                        if (otherSubmenu && otherArrow && !otherSubmenu.classList.contains('submenu-hidden')) {
                            // Smooth closing of other open menus
                            otherSubmenu.style.opacity = '0';
                            otherArrow.classList.remove('rotate-90');

                            // Stagger the closing of multiple menus
                            setTimeout(() => {
                                otherSubmenu.classList.add('submenu-hidden');
                            }, 250 + (index * 50)); // Increased delays with longer stagger
                        }
                    }
                });
            });
        }
    });

}

document.addEventListener('DOMContentLoaded', () => {
    sysInitSidebar();
});