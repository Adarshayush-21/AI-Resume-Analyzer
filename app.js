// AI Resume Analyzer - Main Application Logic
class ResumeAnalyzer {
    constructor() {
        this.selectedFile = null;
        this.analysisResults = null;
        this.initializeEventListeners();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // File upload elements
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const removeFileBtn = document.getElementById('removeFile');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        // Tab elements
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        // Download and share buttons
        const downloadBtn = document.querySelector('.download-btn');
        const shareBtn = document.querySelector('.share-btn');

        // File upload event listeners
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        removeFileBtn.addEventListener('click', this.removeFile.bind(this));
        
        // Analyze button
        analyzeBtn.addEventListener('click', this.analyzeResume.bind(this));
        
        // Tab navigation
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Download and share functionality
        downloadBtn.addEventListener('click', this.downloadReport.bind(this));
        shareBtn.addEventListener('click', this.shareResults.bind(this));
    }

    // Handle drag over event
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }

    // Handle drag leave event
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
    }

    // Handle file drop
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    // Handle file selection
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    // Process the selected file
    processFile(file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Please select a PDF or Word document (.pdf, .doc, .docx)');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB');
            return;
        }

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.enableAnalyzeButton();
    }

    // Display file information
    displayFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const uploadArea = document.getElementById('uploadArea');
        
        fileName.textContent = file.name;
        fileInfo.style.display = 'flex';
        uploadArea.style.display = 'none';
    }

    // Remove selected file
    removeFile() {
        this.selectedFile = null;
        const fileInfo = document.getElementById('fileInfo');
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        fileInfo.style.display = 'none';
        uploadArea.style.display = 'block';
        fileInput.value = '';
        this.disableAnalyzeButton();
    }

    // Enable analyze button
    enableAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = false;
    }

    // Disable analyze button
    disableAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = true;
    }

    // Show loading overlay
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'flex';
    }

    // Hide loading overlay
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'none';
    }

    // Analyze resume
    async analyzeResume() {
        if (!this.selectedFile) {
            this.showError('Please select a file first');
            return;
        }

        this.showLoading();
        
        try {
            // Get job description if provided
            const jobDescription = document.getElementById('jobDescription').value;
            
            // Prepare form data
            const formData = new FormData();
            formData.append('resume', this.selectedFile);
            if (jobDescription) {
                formData.append('jobDescription', jobDescription);
            }

            // Make API call to backend
            const response = await fetch('/api/analyze-resume', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            this.analysisResults = results;
            this.displayResults(results);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError('Analysis failed. Please try again.');
            
            // For demo purposes, show mock results if API fails
            this.displayMockResults();
        } finally {
            this.hideLoading();
        }
    }

    // Display analysis results
    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Update overall score
        this.updateOverallScore(results.overallScore || 85);
        
        // Update metric cards
        this.updateMetricCards(results.metrics);
        
        // Update tab content
        this.updateTabContent(results);
        
        // Show results section
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Display mock results for demo
    displayMockResults() {
        const mockResults = {
            overallScore: 85,
            metrics: {
                skillsMatch: 78,
                experience: 85,
                education: 90,
                format: 82
            },
            strengths: [
                {
                    title: "Strong Technical Skills",
                    description: "Your resume demonstrates proficiency in relevant technologies including JavaScript, Python, and React."
                },
                {
                    title: "Relevant Experience",
                    description: "You have 5+ years of experience in software development with progressive responsibility."
                },
                {
                    title: "Clear Structure",
                    description: "Your resume is well-organized with clear sections and consistent formatting."
                }
            ],
            improvements: [
                {
                    title: "Missing Quantifiable Achievements",
                    description: "Add specific metrics and numbers to demonstrate your impact (e.g., \"Increased performance by 40%\")."
                },
                {
                    title: "Lack of Action Verbs",
                    description: "Use more dynamic action verbs like \"implemented,\" \"optimized,\" or \"developed\" instead of passive language."
                }
            ],
            keywords: {
                found: ["JavaScript", "React", "Python", "SQL", "Git"],
                missing: ["Node.js", "Docker", "AWS", "Agile"]
            },
            recommendations: [
                {
                    title: "Add a Professional Summary",
                    description: "Include a 2-3 line summary at the top highlighting your key strengths and career objectives."
                },
                {
                    title: "Include More Technical Skills",
                    description: "Add skills like Docker, AWS, and microservices to better match job requirements."
                }
            ]
        };
        
        this.displayResults(mockResults);
    }

    // Update overall score display
    updateOverallScore(score) {
        const scoreValue = document.querySelector('.score-value');
        const scoreCircle = document.querySelector('.score-circle');
        
        scoreValue.textContent = score;
        
        // Update the conic gradient based on score
        const percentage = (score / 100) * 360;
        scoreCircle.style.background = `conic-gradient(#48bb78 0deg ${percentage}deg, #e2e8f0 ${percentage}deg 360deg)`;
    }

    // Update metric cards
    updateMetricCards(metrics) {
        if (!metrics) return;
        
        const metricCards = document.querySelectorAll('.metric-card');
        const metricTypes = ['skills', 'experience', 'education', 'format'];
        
        metricCards.forEach((card, index) => {
            const metricType = metricTypes[index];
            const value = metrics[metricType + 'Match'] || metrics[metricType] || 0;
            
            const fill = card.querySelector('.metric-fill');
            const span = card.querySelector('.metric-content span');
            
            fill.style.width = `${value}%`;
            span.textContent = `${value}%`;
        });
    }

    // Update tab content with results
    updateTabContent(results) {
        // Update strengths
        this.updateStrengthsTab(results.strengths);
        
        // Update improvements
        this.updateImprovementsTab(results.improvements);
        
        // Update keywords
        this.updateKeywordsTab(results.keywords);
        
        // Update recommendations
        this.updateRecommendationsTab(results.recommendations);
    }

    // Update strengths tab
    updateStrengthsTab(strengths) {
        const strengthsTab = document.getElementById('strengths');
        if (!strengths || strengths.length === 0) return;
        
        const html = strengths.map(strength => `
            <div class="analysis-item">
                <h4><i class="fas fa-check-circle"></i> ${strength.title}</h4>
                <p>${strength.description}</p>
            </div>
        `).join('');
        
        strengthsTab.innerHTML = html;
    }

    // Update improvements tab
    updateImprovementsTab(improvements) {
        const improvementsTab = document.getElementById('improvements');
        if (!improvements || improvements.length === 0) return;
        
        const html = improvements.map(improvement => `
            <div class="analysis-item warning">
                <h4><i class="fas fa-exclamation-triangle"></i> ${improvement.title}</h4>
                <p>${improvement.description}</p>
            </div>
        `).join('');
        
        improvementsTab.innerHTML = html;
    }

    // Update keywords tab
    updateKeywordsTab(keywords) {
        const keywordsTab = document.getElementById('keywords');
        if (!keywords) return;
        
        const foundKeywords = keywords.found || [];
        const missingKeywords = keywords.missing || [];
        
        const html = `
            <div class="keywords-section">
                <div class="keywords-found">
                    <h4><i class="fas fa-check"></i> Found Keywords</h4>
                    <div class="keyword-tags">
                        ${foundKeywords.map(keyword => `<span class="keyword-tag found">${keyword}</span>`).join('')}
                    </div>
                </div>
                <div class="keywords-missing">
                    <h4><i class="fas fa-times"></i> Missing Keywords</h4>
                    <div class="keyword-tags">
                        ${missingKeywords.map(keyword => `<span class="keyword-tag missing">${keyword}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        
        keywordsTab.innerHTML = html;
    }

    // Update recommendations tab
    updateRecommendationsTab(recommendations) {
        const recommendationsTab = document.getElementById('recommendations');
        if (!recommendations || recommendations.length === 0) return;
        
        const html = recommendations.map(rec => `
            <div class="analysis-item recommendation">
                <h4><i class="fas fa-lightbulb"></i> ${rec.title}</h4>
                <p>${rec.description}</p>
            </div>
        `).join('');
        
        recommendationsTab.innerHTML = html;
    }

    // Switch between tabs
    switchTab(tabName) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        // Add active class to selected tab and button
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    // Download report
    downloadReport() {
        if (!this.analysisResults) {
            this.showError('No analysis results to download');
            return;
        }

        try {
            // Create report content
            const reportContent = this.generateReportContent();
            
            // Create blob and download
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume-analysis-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Report downloaded successfully!');
        } catch (error) {
            console.error('Download failed:', error);
            this.showError('Download failed. Please try again.');
        }
    }

    // Generate report content
    generateReportContent() {
        const results = this.analysisResults;
        const date = new Date().toLocaleDateString();
        
        return `
AI RESUME ANALYSIS REPORT
Generated on: ${date}
File: ${this.selectedFile?.name || 'N/A'}

OVERALL SCORE: ${results.overallScore || 'N/A'}%

METRICS:
- Skills Match: ${results.metrics?.skillsMatch || 'N/A'}%
- Experience: ${results.metrics?.experience || 'N/A'}%
- Education: ${results.metrics?.education || 'N/A'}%
- Format: ${results.metrics?.format || 'N/A'}%

STRENGTHS:
${results.strengths?.map(s => `• ${s.title}: ${s.description}`).join('\n') || 'No strengths data available'}

AREAS FOR IMPROVEMENT:
${results.improvements?.map(i => `• ${i.title}: ${i.description}`).join('\n') || 'No improvement data available'}

KEYWORDS:
Found: ${results.keywords?.found?.join(', ') || 'None'}
Missing: ${results.keywords?.missing?.join(', ') || 'None'}

RECOMMENDATIONS:
${results.recommendations?.map(r => `• ${r.title}: ${r.description}`).join('\n') || 'No recommendations available'}

---
Generated by AI Resume Analyzer
        `.trim();
    }

    // Share results
    shareResults() {
        if (!this.analysisResults) {
            this.showError('No analysis results to share');
            return;
        }

        if (navigator.share) {
            // Use native Web Share API if available
            navigator.share({
                title: 'My Resume Analysis Results',
                text: `I just analyzed my resume and got a score of ${this.analysisResults.overallScore}%!`,
                url: window.location.href
            }).then(() => {
                this.showSuccess('Results shared successfully!');
            }).catch((error) => {
                console.error('Share failed:', error);
                this.fallbackShare();
            });
        } else {
            this.fallbackShare();
        }
    }

    // Fallback share method
    fallbackShare() {
        const shareText = `I just analyzed my resume and got a score of ${this.analysisResults.overallScore}%! Check out AI Resume Analyzer: ${window.location.href}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showSuccess('Share link copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy share link');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showSuccess('Share link copied to clipboard!');
            } catch (err) {
                this.showError('Failed to copy share link');
            }
            document.body.removeChild(textArea);
        }
    }

    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Utility functions
const utils = {
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the resume analyzer
    window.resumeAnalyzer = new ResumeAnalyzer();
    
    // Add notification styles to head
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(notificationStyles);
    
    console.log('AI Resume Analyzer initialized successfully');
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResumeAnalyzer, utils };
}