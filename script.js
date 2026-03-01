document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    const translateBtn = document.getElementById('translate-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressStatus = document.getElementById('progress-status');
    const resultActions = document.getElementById('result-actions');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const themeToggle = document.getElementById('theme-toggle');
    const uiLangSelector = document.getElementById('ui-lang');

    let currentFile = null;
    let translatedContent = null;
    const API_URL = 'https://turjuman-fqwj.vercel.app/api';

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('translator-theme', isDark ? 'dark' : 'light');
    });

    // Load Theme
    if (localStorage.getItem('translator-theme') === 'light') {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        const allowedExtensions = ['txt', 'html', 'htm', 'md'];
        const ext = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            alert('يرجى اختيار ملف مدعوم (TXT, HTML, MD)');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        translateBtn.disabled = false;
    }

    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        dropZone.classList.remove('hidden');
        translateBtn.disabled = true;
    });

    // Translation Logic
    translateBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        translateBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '10%';
        progressStatus.textContent = 'جاري قراءة الملف...';

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const ext = currentFile.name.split('.').pop().toLowerCase();
            
            try {
                if (ext === 'html' || ext === 'htm') {
                    translatedContent = await translateHTML(content);
                } else {
                    translatedContent = await translatePlain(content);
                }

                progressFill.style.width = '100%';
                progressStatus.textContent = 'تمت الترجمة بنجاح!';
                resultActions.classList.remove('hidden');
                translateBtn.classList.add('hidden');
            } catch (err) {
                console.error(err);
                progressStatus.textContent = 'حدث خطأ أثناء الترجمة. يرجى المحاولة لاحقاً.';
                translateBtn.disabled = false;
            }
        };
        reader.readAsText(currentFile);
    });

    async function translatePlain(text) {
        progressStatus.textContent = 'جاري تقسيم النص وترجمته...';
        // Split by new lines to maintain structure
        const lines = text.split('\n');
        const translatedLines = [];
        const batchSize = 5;

        for (let i = 0; i < lines.length; i += batchSize) {
            const batch = lines.slice(i, i + batchSize);
            const batchText = batch.join('\n');
            
            if (batchText.trim()) {
                const res = await fetch(`${API_URL}/translate?sl=${sourceLang.value}&tl=${targetLang.value}&q=${encodeURIComponent(batchText)}`);
                const data = await res.json();
                if (data && data[0]) {
                    translatedLines.push(data[0].map(s => s[0]).join(''));
                } else {
                    translatedLines.push(batchText);
                }
            } else {
                translatedLines.push(batchText);
            }

            const progress = 10 + Math.floor((i / lines.length) * 80);
            progressFill.style.width = `${progress}%`;
        }

        return translatedLines.join('\n');
    }

    async function translateHTML(html) {
        progressStatus.textContent = 'جاري معالجة وسم HTML...';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all text nodes that are not inside scripts or styles
        const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentElement.tagName.toLowerCase();
                if (['script', 'style', 'code', 'pre'].includes(parent)) return NodeFilter.FILTER_REJECT;
                if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) textNodes.push(node);

        for (let i = 0; i < textNodes.length; i++) {
            const original = textNodes[i].textContent;
            const res = await fetch(`${API_URL}/translate?sl=${sourceLang.value}&tl=${targetLang.value}&q=${encodeURIComponent(original)}`);
            const data = await res.json();
            if (data && data[0]) {
                textNodes[i].textContent = data[0].map(s => s[0]).join('');
            }
            
            const progress = 10 + Math.floor((i / textNodes.length) * 80);
            progressFill.style.width = `${progress}%`;
            progressStatus.textContent = `متبقي ${textNodes.length - i} جزء...`;
        }

        return doc.documentElement.outerHTML;
    }

    // Download
    downloadBtn.addEventListener('click', () => {
        if (!translatedContent) return;

        const blob = new Blob([translatedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const originalName = currentFile.name.split('.');
        const ext = originalName.pop();
        a.href = url;
        a.download = `${originalName.join('.')}_translated.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    resetBtn.addEventListener('click', () => {
        location.reload();
    });
});
