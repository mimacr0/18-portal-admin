document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission
    const form = document.getElementById('user-config-form-data');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const formData = {
            sidebar: document.getElementById('user-config-form-sidebar').value,
            darkMode: document.getElementById('user-config-form-dark-mode').value,
            header: document.getElementById('user-config-form-header').value,
            footer: document.getElementById('user-config-form-footer').value
        };

        try {
            // Send Fetch request to save configuration
            const response = await jsonPost('/user/config/update', formData)
            if (response?.status != 'success') throw new Error('Network response was not ok');
        } catch (error) {
            console.error('Config save error:', error);
        }
    });

    // Handle form reset
    form.addEventListener('reset', async () => {
        if(!confirm('Are you sure ?')) return
        await jsonPost('/user/config/reset')
        document.getElementById('user-config-form-sidebar').value = ''
        document.getElementById('user-config-form-dark-mode').value = ''
        document.getElementById('user-config-form-header').value = ''
        document.getElementById('user-config-form-footer').value = ''
    })
});
