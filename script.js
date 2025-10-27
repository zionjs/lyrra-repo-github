// script.js
class GitHubUploader {
    constructor() {
        this.form = document.getElementById('uploadForm');
        this.fileInput = document.getElementById('fileInput');
        this.fileDropZone = document.getElementById('fileDropZone');
        this.fileName = document.getElementById('fileName');
        this.submitBtn = document.getElementById('submitBtn');
        this.btnText = document.getElementById('btnText');
        this.btnSpinner = document.getElementById('btnSpinner');
        this.message = document.getElementById('message');
        this.result = document.getElementById('result');
        this.fileUrl = document.getElementById('fileUrl');
        this.downloadUrl = document.getElementById('downloadUrl');

        this.initEventListeners();
    }

    initEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        // Drag and drop
        this.fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.add('dragover');
        });

        this.fileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.remove('dragover');
        });

        this.fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.fileInput.files = files;
                this.handleFileSelect({ target: this.fileInput });
            }
        });

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.fileName.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            
            // Auto-fill file path if empty
            const filePathInput = document.getElementById('filePath');
            if (!filePathInput.value) {
                filePathInput.value = file.name;
            }
        } else {
            this.fileName.textContent = 'Belum ada file dipilih';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async handleSubmit() {
        const formData = new FormData(this.form);
        const file = this.fileInput.files[0];

        if (!file) {
            this.showMessage('Silakan pilih file terlebih dahulu', 'error');
            return;
        }

        // Validasi token GitHub
        const token = document.getElementById('githubToken').value;
        if (!token.startsWith('ghp_')) {
            this.showMessage('Format GitHub token tidak valid. Token harus dimulai dengan "ghp_"', 'error');
            return;
        }

        this.setLoading(true);

        try {
            const result = await this.uploadToGitHub(formData);
            this.showSuccess(result);
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async uploadToGitHub(formData) {
        const file = this.fileInput.files[0];
        const token = document.getElementById('githubToken').value;
        const user = document.getElementById('githubUser').value;
        const repo = document.getElementById('githubRepo').value;
        const branch = document.getElementById('githubBranch').value || 'main';
        const filePath = document.getElementById('filePath').value || file.name;
        const commitMessage = document.getElementById('commitMessage').value;

        // Baca file sebagai base64
        const base64Content = await this.readFileAsBase64(file);

        // Siapkan data untuk GitHub API
        const data = {
            message: commitMessage,
            content: base64Content,
            branch: branch
        };

        const url = `https://api.github.com/repos/${user}/${repo}/contents/${filePath}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Hapus data:application/octet-stream;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.btnText.style.display = 'none';
            this.btnSpinner.style.display = 'block';
        } else {
            this.submitBtn.disabled = false;
            this.btnText.style.display = 'block';
            this.btnSpinner.style.display = 'none';
        }
    }

    showMessage(message, type) {
        this.message.className = `message ${type}`;
        this.message.innerHTML = message;
        this.message.style.display = 'block';
        this.result.classList.remove('show');

        // Auto hide success message after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.message.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(result) {
        const fileUrl = result.content.html_url;
        const downloadUrl = result.content.download_url;

        this.fileUrl.href = fileUrl;
        this.fileUrl.textContent = fileUrl;
        this.downloadUrl.href = downloadUrl;
        this.downloadUrl.textContent = downloadUrl;

        this.result.classList.add('show');
        this.showMessage('✅ File berhasil diupload ke GitHub!', 'success');

        // Reset form
        this.form.reset();
        this.fileName.textContent = 'Belum ada file dipilih';
        document.getElementById('githubBranch').value = 'main';
    }
}

// Inisialisasi aplikasi ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
    new GitHubUploader();
});

// Tambahan: Simpan konfigurasi ke localStorage
function saveConfig() {
    const config = {
        token: document.getElementById('githubToken').value,
        user: document.getElementById('githubUser').value,
        repo: document.getElementById('githubRepo').value,
        branch: document.getElementById('githubBranch').value
    };
    localStorage.setItem('githubUploaderConfig', JSON.stringify(config));
}

function loadConfig() {
    const saved = localStorage.getItem('githubUploaderConfig');
    if (saved) {
        const config = JSON.parse(saved);
        document.getElementById('githubToken').value = config.token || '';
        document.getElementById('githubUser').value = config.user || '';
        document.getElementById('githubRepo').value = config.repo || '';
        document.getElementById('githubBranch').value = config.branch || 'main';
    }
}

// Auto-save config ketika input berubah
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    
    const inputs = ['githubToken', 'githubUser', 'githubRepo', 'githubBranch'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', saveConfig);
    });
});