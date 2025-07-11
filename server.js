const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// File processing libraries
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');

// AI/ML libraries (you can replace with your preferred AI service)
const OpenAI = require('openai');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI (optional - replace with your AI service)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only PDF and Word documents
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
        }
    }
});

// Resume Analysis Class
class ResumeAnalyzer {
    constructor() {
        this.skillsDatabase = this.loadSkillsDatabase();
        this.stopWords = new Set(natural.stopwords);
    }

    // Load skills database
    loadSkillsDatabase() {
        return {
            technical: [
                'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb',
                'aws', 'docker', 'kubernetes', 'git', 'html', 'css', 'typescript',
                'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel',
                'postgresql', 'mysql', 'redis', 'elasticsearch', 'graphql', 'rest',
                'microservices', 'agile', 'scrum', 'devops', 'ci/cd', 'jenkins',
                'terraform', 'linux', 'bash', 'powershell', 'azure', 'gcp'
            ],
            soft: [
                'leadership', 'communication', 'teamwork', 'problem-solving',
                'analytical', 'creative', 'adaptable', 'detail-oriented',
                'time-management', 'project-management', 'collaboration',
                'critical-thinking', 'decision-making', 'negotiation'
            ],
            certifications: [
                'aws certified', 'azure certified', 'google cloud', 'pmp',
                'scrum master', 'cissp', 'comptia', 'cisco', 'microsoft certified'
            ]
        };
    }

    // Extract text from PDF
    async extractPDFText(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }

    // Extract text from Word document
    async extractWordText(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error) {
            console.error('Word extraction error:', error);
            throw new Error('Failed to extract text from Word document');
        }
    }

    // Extract text based on file type
    async extractText(filePath, mimeType) {
        switch (mimeType) {
            case 'application/pdf':
                return await this.extractPDFText(filePath);
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return await this.extractWordText(filePath);
            default:
                throw new Error('Unsupported file type');
        }
    }

    // Analyze resume content
    async analyzeResume(resumeText, jobDescription = '') {
        try {
            // Basic text processing
            const processedText = this.preprocessText(resumeText);
            const jobProcessedText = jobDescription ? this.preprocessText(jobDescription) : '';

            // Extract various components
            const skills = this.extractSkills(processedText);
            const experience = this.analyzeExperience(processedText);
            const education = this.analyzeEducation(processedText);
            const format = this.analyzeFormat(resumeText);

            // Calculate scores
            const scores = this.calculateScores(skills, experience, education, format, jobProcessedText);

            // Generate insights
            const insights = this.generateInsights(processedText, jobProcessedText, skills, experience, education);

            // Use AI for enhanced analysis if available
            let aiInsights = null;
            if (openai) {
                aiInsights = await this.getAIInsights(resumeText, jobDescription);
            }

            return {
                overallScore: scores.overall,
                metrics: {
                    skillsMatch: scores.skills,
                    experience: scores.experience,
                    education: scores.education,
                    format: scores.format
                },
                strengths: insights.strengths,
                improvements: insights.improvements,
                keywords: insights.keywords,
                recommendations: insights.recommendations,
                aiInsights: aiInsights,
                extractedData: {
                    skills: skills,
                    experience: experience,
                    education: education
                }
            };
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error('Failed to analyze resume');
        }
    }

    // Preprocess text
    preprocessText(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Extract skills from text
    extractSkills(text) {
        const foundSkills = {
            technical: [],
            soft: [],
            certifications: []
        };

        // Check for technical skills
        this.skillsDatabase.technical.forEach(skill => {
            if (text.includes(skill.toLowerCase())) {
                foundSkills.technical.push(skill);
            }
        });

        // Check for soft skills
        this.skillsDatabase.soft.forEach(skill => {
            if (text.includes(skill.toLowerCase())) {
                foundSkills.soft.push(skill);
            }
        });

        // Check for certifications
        this.skillsDatabase.certifications.forEach(cert => {
            if (text.includes(cert.toLowerCase())) {
                foundSkills.certifications.push(cert);
            }
        });

        return foundSkills;
    }

    // Analyze experience
    analyzeExperience(text) {
        const experienceKeywords = ['years', 'experience', 'worked', 'developed', 'managed', 'led', 'created'];
        const yearPattern = /(\d{1,2})\+?\s*(years?|yrs?)/gi;
        const yearMatches = text.match(yearPattern);
        
        let experienceScore = 0;
        let experienceYears = 0;

        if (yearMatches) {
            yearMatches.forEach(match => {
                const years = parseInt(match.match(/\d+/)[0]);
                experienceYears = Math.max(experienceYears, years);
            });
        }

        // Score based on experience years
        if (experienceYears >= 10) experienceScore = 100;
        else if (experienceYears >= 5) experienceScore = 85;
        else if (experienceYears >= 3) experienceScore = 70;
        else if (experienceYears >= 1) experienceScore = 50;
        else experienceScore = 30;

        return {
            years: experienceYears,
            score: experienceScore,
            keywords: experienceKeywords.filter(keyword => text.includes(keyword))
        };
    }

    // Analyze education
    analyzeEducation(text) {
        const educationKeywords = ['degree', 'bachelor', 'master', 'phd', 'university', 'college', 'graduate'];
        const foundEducation = [];
        let educationScore = 50; // Base score

        if (text.includes('phd') || text.includes('doctorate')) {
            foundEducation.push('PhD/Doctorate');
            educationScore = 100;
        } else if (text.includes('master') || text.includes('mba')) {
            foundEducation.push('Master\'s Degree');
            educationScore = 90;
        } else if (text.includes('bachelor') || text.includes('degree')) {
            foundEducation.push('Bachelor\'s Degree');
            educationScore = 80;
        }

        return {
            degrees: foundEducation,
            score: educationScore,
            keywords: educationKeywords.filter(keyword => text.includes(keyword))
        };
    }

    // Analyze format and structure
    analyzeFormat(text) {
        let formatScore = 50; // Base score
        const sections = [];

        // Check for common resume sections
        const sectionKeywords = {
            'contact': ['email', 'phone', 'address', 'linkedin'],
            'summary': ['summary', 'objective', 'profile'],
            'experience': ['experience', 'work', 'employment'],
            'education': ['education', 'degree', 'university'],
            'skills': ['skills', 'technologies', 'competencies'],
            'projects': ['projects', 'portfolio'],
            'achievements': ['achievements', 'awards', 'accomplishments']
        };

        Object.keys(sectionKeywords).forEach(section => {
            const hasSection = sectionKeywords[section].some(keyword => 
                text.toLowerCase().includes(keyword)
            );
            if (hasSection) {
                sections.push(section);
                formatScore += 5;
            }
        });

        // Check for good length (not too short, not too long)
        const wordCount = text.split(/\s+/).length;
        if (wordCount >= 300 && wordCount <= 1000) {
            formatScore += 10;
        }

        return {
            score: Math.min(formatScore, 100),
            sections: sections,
            wordCount: wordCount
        };
    }

    // Calculate overall scores
    calculateScores(skills, experience, education, format, jobText) {
        const skillsScore = this.calculateSkillsScore(skills, jobText);
        const experienceScore = experience.score;
        const educationScore = education.score;
        const formatScore = format.score;

        const overall = Math.round((skillsScore + experienceScore + educationScore + formatScore) / 4);

        return {
            overall,
            skills: skillsScore,
            experience: experienceScore,
            education: educationScore,
            format: formatScore
        };
    }

    // Calculate skills score
    calculateSkillsScore(skills, jobText) {
        let score = 30; // Base score

        // Technical skills
        score += Math.min(skills.technical.length * 8, 40);

        // Soft skills
        score += Math.min(skills.soft.length * 5, 20);

        // Certifications
        score += Math.min(skills.certifications.length * 10, 30);

        // Job matching bonus
        if (jobText) {
            const matchingSkills = skills.technical.filter(skill => 
                jobText.includes(skill.toLowerCase())
            );
            score += Math.min(matchingSkills.length * 5, 20);
        }

        return Math.min(score, 100);
    }

    // Generate insights
    generateInsights(resumeText, jobText, skills, experience, education) {
        const strengths = [];
        const improvements = [];
        const recommendations = [];

        // Analyze strengths
        if (skills.technical.length > 5) {
            strengths.push({
                title: "Strong Technical Skills",
                description: `Your resume demonstrates proficiency in ${skills.technical.length} technical skills including ${skills.technical.slice(0, 3).join(', ')}.`
            });
        }

        if (experience.years > 3) {
            strengths.push({
                title: "Relevant Experience",
                description: `You have ${experience.years}+ years of experience which demonstrates career progression.`
            });
        }

        if (education.degrees.length > 0) {
            strengths.push({
                title: "Strong Educational Background",
                description: `Your ${education.degrees.join(', ')} provides a solid foundation for your career.`
            });
        }

        // Analyze improvements
        if (skills.technical.length < 3) {
            improvements.push({
                title: "Limited Technical Skills",
                description: "Consider adding more technical skills relevant to your field to make your resume more competitive."
            });
        }

        if (!resumeText.includes('achieved') && !resumeText.includes('increased')) {
            improvements.push({
                title: "Missing Quantifiable Achievements",
                description: "Add specific metrics and numbers to demonstrate your impact (e.g., 'Increased performance by 40%')."
            });
        }

        // Generate recommendations
        recommendations.push({
            title: "Add a Professional Summary",
            description: "Include a 2-3 line summary at the top highlighting your key strengths and career objectives."
        });

        if (jobText) {
            const missingSkills = this.findMissingSkills(skills, jobText);
            if (missingSkills.length > 0) {
                recommendations.push({
                    title: "Include Job-Specific Skills",
                    description: `Consider adding these skills mentioned in the job description: ${missingSkills.slice(0, 3).join(', ')}.`
                });
            }
        }

        // Keywords analysis
        const foundKeywords = [...skills.technical, ...skills.soft];
        const jobKeywords = jobText ? this.extractJobKeywords(jobText) : [];
        const missingKeywords = jobKeywords.filter(keyword => 
            !foundKeywords.some(found => found.toLowerCase().includes(keyword.toLowerCase()))
        );

        return {
            strengths,
            improvements,
            recommendations,
            keywords: {
                found: foundKeywords,
                missing: missingKeywords
            }
        };
    }

    // Find missing skills from job description
    findMissingSkills(skills, jobText) {
        const allFoundSkills = [...skills.technical, ...skills.soft, ...skills.certifications];
        const missingSkills = [];

        this.skillsDatabase.technical.forEach(skill => {
            if (jobText.includes(skill.toLowerCase()) && 
                !allFoundSkills.some(found => found.toLowerCase().includes(skill.toLowerCase()))) {
                missingSkills.push(skill);
            }
        });

        return missingSkills;
    }

    // Extract keywords from job description
    extractJobKeywords(jobText) {
        const words = jobText.split(/\s+/);
        const keywords = [];

        words.forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
            if (cleanWord.length > 3 && !this.stopWords.has(cleanWord)) {
                if (this.skillsDatabase.technical.includes(cleanWord) ||
                    this.skillsDatabase.soft.includes(cleanWord)) {
                    keywords.push(cleanWord);
                }
            }
        });

        return [...new Set(keywords)];
    }

    // Get AI insights (if OpenAI is available)
    async getAIInsights(resumeText, jobDescription) {
        if (!openai) return null;

        try {
            const prompt = `
                Analyze this resume and provide professional insights:
                
                Resume: ${resumeText.substring(0, 2000)}
                ${jobDescription ? `Job Description: ${jobDescription.substring(0, 1000)}` : ''}
                
                Please provide:
                1. Top 3 strengths
                2. Top 3 areas for improvement
                3. Specific recommendations for better job matching
                
                Keep responses concise and professional.
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
                temperature: 0.7
            });

            return {
                analysis: response.choices[0].message.content,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('AI analysis error:', error);
            return null;
        }
    }
}

// Initialize analyzer
const analyzer = new ResumeAnalyzer();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Resume analysis endpoint
app.post('/api/analyze-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { jobDescription = '' } = req.body;
        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // Extract text from file
        const resumeText = await analyzer.extractText(filePath, mimeType);
        
        if (!resumeText || resumeText.length < 100) {
            return res.status(400).json({ error: 'Unable to extract sufficient text from the resume' });
        }

        // Analyze resume
        const analysisResults = await analyzer.analyzeResume(resumeText, jobDescription);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            analysis: analysisResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Resume analysis error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            error: 'Failed to analyze resume', 
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Clean up old files periodically
setInterval(() => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) return;
            
            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    
                    // Delete files older than 1 hour
                    if (Date.now() - stats.mtime.getTime() > 3600000) {
                        fs.unlink(filePath, (err) => {
                            if (err) console.error('Error deleting old file:', err);
                        });
                    }
                });
            });
        });
    }
}, 1800000); // Run every 30 minutes

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Resume Analyzer server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api/analyze-resume`);
});

module.exports = app;