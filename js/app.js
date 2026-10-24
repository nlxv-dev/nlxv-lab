document.addEventListener('DOMContentLoaded', () => {
    const logIndexList = document.getElementById('logIndexList');
    const markdownViewer = document.getElementById('markdownViewer');
    const currentLogId = document.getElementById('currentLogId');
    const currentLogDate = document.getElementById('currentLogDate');

    // Fetch Manifest and Render Sidebar Index
    async function initApp() {
        try {
            const response = await fetch('entries/manifest.json');
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status}`);
            }
            const entries = await response.json();
            
            renderIndex(entries);
            
            // Auto-load the first entry if available
            if (entries.length > 0) {
                loadLogEntry(entries[0]);
            }
        } catch (error) {
            console.error('Initialization error:', error);
            logIndexList.innerHTML = `<li class="error-state">Error loading index.</li>`;
            markdownViewer.innerHTML = `<p class="placeholder-text">Failed to fetch index manifest.</p>`;
        }
    }

    // Render list of available log entries
    function renderIndex(entries) {
        logIndexList.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = `log-item ${index === 0 ? 'active' : ''}`;
            li.setAttribute('data-file', entry.file);
            li.setAttribute('data-id', entry.id);
            li.setAttribute('data-date', entry.date);
            
            li.innerHTML = `
                <span class="log-title">${entry.title}</span>
                <span class="log-date">${entry.date}</span>
            `;

            li.addEventListener('click', () => {
                document.querySelectorAll('.log-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                loadLogEntry(entry);
            });

            logIndexList.appendChild(li);
        });
    }

    // Fetch Markdown content and parse using Marked
    async function loadLogEntry(entry) {
        currentLogId.textContent = entry.id;
        currentLogDate.textContent = entry.date;
        markdownViewer.innerHTML = `<p class="placeholder-text">Fetching content...</p>`;

        try {
            const response = await fetch(`entries/${entry.file}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdownText = await response.text();
            
            // Render HTML via marked.js
            if (typeof marked !== 'undefined') {
                markdownViewer.innerHTML = marked.parse(markdownText);
            } else {
                markdownViewer.innerHTML = `<pre>${markdownText}</pre>`;
            }
        } catch (error) {
            console.error('Error fetching entry:', error);
            markdownViewer.innerHTML = `<p class="placeholder-text">Error loading log content [404/ERR].</p>`;
        }
    }

    // Start application
    initApp();
});
