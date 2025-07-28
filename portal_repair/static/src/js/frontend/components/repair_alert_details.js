import { rpc } from "@web/core/network/rpc";

const clearBodyHTML = (body) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = body;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    return textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
}

// Display attachment preview in the message input area
const displayAttachmentPreview = (messageInputContainer, file, state) => {
    if (!messageInputContainer || !file) return;

    // Remove any existing preview
    const existingPreview = document.querySelector('.attachment-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    // Create preview element
    const fileSize = (file.size / 1024).toFixed(0) + ' KB';
    const fileExtension = file.name.split('.').pop().toLowerCase();

    // Choose icon based on file type
    let fileIcon = 'fa-file';
    if (['pdf'].includes(fileExtension)) fileIcon = 'fa-file-pdf';
    else if (['doc', 'docx'].includes(fileExtension)) fileIcon = 'fa-file-word';
    else if (['xls', 'xlsx'].includes(fileExtension)) fileIcon = 'fa-file-excel';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) fileIcon = 'fa-file-image';

    const previewHTML = `
      <div class="attachment-preview bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 p-2 flex items-center mt-2 mx-2">
        <div class="attachment-icon p-2 bg-gray-100 dark:bg-gray-800 rounded-md mr-3">
          <i class="fas ${fileIcon} text-gray-700 dark:text-gray-200"></i>
        </div>
        <div class="attachment-info flex-grow">
          <div class="attachment-name text-sm text-gray-800 dark:text-white text-truncate" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
          <div class="attachment-size text-xs text-gray-500 dark:text-gray-300">${fileSize}</div>
        </div>
        <button class="remove-attachment text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 p-2">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    messageInputContainer.insertAdjacentHTML('beforeend', previewHTML);

    // Add event listener to remove button
    const removeButton = document.querySelector('.remove-attachment');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        document.querySelector('.attachment-preview').remove();
        state.selectedFile = null;
      });
    }
};

// Clean up attachments after sending a message
const cleanupAttachments = (messageInputContainer, state = {}, fileInput) => {
    if (!messageInputContainer) return;

    // Remove attachment previews from the message input container
    const attachmentPreviews = messageInputContainer.querySelectorAll('.attachment-preview');
    if (attachmentPreviews.length > 0) {
        attachmentPreviews.forEach(preview => preview.remove());
    }

    // Reset selected file if using state object
    if (state) state.selectedFile = null;

    // Reset file input using the stored reference
    if (fileInput) { fileInput.value = ''; }
};

const reloadRepairAlertDetailsChatter = async () => {
    const chatter = document.getElementById('repair_alert_details-details-chat-messages');
    if (!chatter) return;

    const alerId = parseInt(chatter.dataset.alerId);
    const partnerId = parseInt(chatter.dataset.partnerId);

    const response = await rpc('/portal_repair/repair_alert/details/chatter/fetch', {
        reception_id: alerId
    })

    const messages = response?.data['mail.message'] || [];
    if (messages.length === 0) {
        chatter.innerHTML = '<p class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">No messages found.</p>';
        return;
    }

    chatter.innerHTML = '';

    for (const message of messages) {
        const isFromMe = partnerId === message.author.id;
        const attachments = message.attachment_ids || [];
        const attachmentsHTML = attachments.map(attachment => {
        return `
            <div class="message-attachment bg-gray-50 dark:bg-gray-600 border border-gray-100 dark:border-gray-500 rounded-md p-2 flex items-center my-2">
                <div class="attachment-icon p-2 bg-gray-100 dark:bg-gray-700 rounded-md mr-3">
                    <i class="fas fa-file-pdf text-gray-700 dark:text-gray-200"></i>
                </div>
                <div class="attachment-info flex-grow">
                    <div class="attachment-name text-sm text-gray-800 dark:text-white">${attachment.name}</div>
                </div>
                <a href="/web/content/${attachment.id}?access_token=${attachment.access_token}&filename=${attachment.name}&unique=${attachment.checksum}&download=true" target="_blank" class="attachment-action text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2">
                    <i class="fas fa-download"></i>
                </a>
            </div>`;
        }).join('');

        const messageElement = isFromMe ?
        `
        <div class="chat-message chat-message-animate flex items-start mb-4 justify-end" style="animation-delay: 0s">
            <div class="chat-avatar w-8 h-8 rounded-full bg-gray-500 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center mr-2">
                <img src="${message.author_avatar_url}" alt="Avatar" class="w-5 h-5 rounded-full">
            </div>
            <div class="chat-message-content max-w-[80%]">
                <div class="chat-message-meta flex items-center mb-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-200 mr-2">${message.author.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${message.date}</span>
                </div>
                <div class="chat-bubble bg-blue-500 dark:bg-blue-900/30 shadow-sm dark:shadow-gray-900/30 p-3 rounded-lg rounded-tl-none">
                    <p class="text-white">${clearBodyHTML(message.body)}</p>
                    ${attachmentsHTML.trim()}
                    <div class="message-status flex items-center justify-end mt-1">
                        <svg viewBox="0 0 16 15" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="text-blue-400 dark:text-blue-400 mr-1">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        ` : `
        <div class="chat-message chat-message-animate flex items-start mb-4" style="animation-delay: 0s">
            <div class="chat-avatar w-8 h-8 rounded-full bg-gray-500 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center mr-2">
                <img src="${message.author_avatar_url}" alt="Avatar" class="w-5 h-5 rounded-full">
            </div>
            <div class="chat-message-content max-w-[80%]">
                <div class="chat-message-meta flex items-center mb-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-200 mr-2">${message.author.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${message.date}</span>
                </div>
                <div class="chat-bubble bg-gray-100 dark:bg-gray-700 shadow-sm dark:shadow-gray-900/30 p-3 rounded-lg rounded-tl-none">
                    <p class="text-gray-800 dark:text-white">${clearBodyHTML(message.body)}</p>
                    ${attachmentsHTML.trim()}
                    <div class="message-status flex items-center justify-end mt-1">
                        <svg viewBox="0 0 16 15" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="text-blue-400 dark:text-blue-400 mr-1">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        `;
        chatter.innerHTML += messageElement;
    }

    // Scroll to the bottom of the chatter
    chatter.scrollTop = chatter.scrollHeight;
}

const initMessageSending = () => {
    const chatter = document.getElementById('repair_alert_details-details-chat-messages');
    if (!chatter) return;

    const alerId = parseInt(chatter.dataset.alerId);

    // Get message sending elements
    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.message-send-button');
    const messageInputContainer = document.getElementById('message-input-container');
    const attachButton = document.querySelector('.message-attach-button');
    const fileInput = document.getElementById('page-details-repair_alert_details-message-attachment-input');
    const tokenInput = document.getElementById('page-details-repair_alert_details-message-attachment-token');
    let selectedFile = null;

    if (!messageInput || !sendButton || !messageInputContainer) return;

    // Initialize message input auto-resize
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = `${this.scrollHeight}px`;
        if (this.value.trim() === '') {
            this.style.height = 'auto';
        }
    });

    // Create state object to track file
    const messageState = {
        selectedFile: null
    };

    // Send message function
    const sendMessage = async () => {
        const messageText = messageInput.value.trim();
        if (messageText === '' && !messageState.selectedFile) return;

        const formData = new FormData();
        formData.append('reception_id', alerId);
        formData.append('csrf_token', tokenInput.value);
        formData.append('message', messageText);
        formData.append('attachment', messageState.selectedFile);

        let response = null;

        // Send message to server
        try {
            const result = await fetch('/portal_repair/repair_alert/details/chatter/post', {
                method: 'POST',
                body: formData
            });
            response = await result.json();
            console.log('Message sent:', response);

            // Reload messages after sending
            await reloadRepairAlertDetailsChatter();
        } catch (error) {
            console.error('Error sending message:', error);
        }

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Clean up attachments
        cleanupAttachments(messageInputContainer, messageState, fileInput);

        if (response?.status === 'error') return console.error('Error sending message:', response.message);
    };

    // Initialize event listeners
    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Initialize file attachment functionality
    if (attachButton) {
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                messageState.selectedFile = e.target.files[0];
                displayAttachmentPreview(messageInputContainer, messageState.selectedFile, messageState);
            }
        });

        // Open file dialog when attach button is clicked
        attachButton.addEventListener('click', () => {
            if(fileInput) fileInput.click();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    reloadRepairAlertDetailsChatter();
    initMessageSending();

    document.addEventListener('portal_repair.portal_repair_details_reload_request', (event) => {
        console.log('Reloading repair_alert details chatter', event.detail);
        reloadRepairAlertDetailsChatter();
    });
});
