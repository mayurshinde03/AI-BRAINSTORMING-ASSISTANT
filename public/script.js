class BrainstormingApp {
    constructor() {
        this.socket = io();
        this.currentSession = 'default';
        this.personas = {};
        this.scoringCriteria = {};
        this.selectedPersona = null;
        this.currentIdea = null;
        
        // Initialize theme first
        this.initializeTheme();
        this.initializeApp();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    // Theme Management
    initializeTheme() {
        // Check for saved theme preference or default to 'light'
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme = savedTheme;
        if (!theme) {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        this.setTheme(theme);
        this.setupThemeToggle();
        this.setupSystemThemeListener();
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // Update toggle state
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.setAttribute('aria-label', 
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            );
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        
        // Announce theme change for accessibility
        this.announceThemeChange(newTheme);
    }

    announceThemeChange(theme) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = `Switched to ${theme} mode`;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Keyboard support
            themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem('theme-manual-override')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Your existing methods remain the same...
    async initializeApp() {
        await this.loadPersonas();
        await this.loadScoringCriteria();
        await this.loadSessionIdeas();
        this.setupTabs();
    }

    async loadPersonas() {
        try {
            const response = await fetch('/api/personas');
            const data = await response.json();
            
            if (data.success) {
                this.personas = data.personas;
                this.renderPersonas();
                this.populatePersonaSelect();
            }
        } catch (error) {
            console.error('Error loading personas:', error);
        }
    }

    async loadScoringCriteria() {
        try {
            const response = await fetch('/api/scoring-criteria');
            const data = await response.json();
            
            if (data.success) {
                this.scoringCriteria = data.criteria;
                this.renderScoringCriteria();
            }
        } catch (error) {
            console.error('Error loading scoring criteria:', error);
        }
    }

    async loadSessionIdeas() {
        try {
            const response = await fetch(`/api/session/${this.currentSession}/ideas`);
            const data = await response.json();
            
            if (data.success) {
                this.renderRecentIdeas(data.ideas);
                this.renderIdeasBoard(data.ideas);
            }
        } catch (error) {
            console.error('Error loading session ideas:', error);
        }
    }

    renderPersonas() {
        const personaList = document.getElementById('personaList');
        personaList.innerHTML = '';

        Object.entries(this.personas).forEach(([key, persona]) => {
            const personaCard = document.createElement('div');
            personaCard.className = 'persona-card';
            personaCard.dataset.persona = key;
            personaCard.setAttribute('role', 'button');
            personaCard.setAttribute('tabindex', '0');
            personaCard.setAttribute('aria-label', `Select ${persona.name} persona`);
            
            personaCard.innerHTML = `
                <div class="persona-name">${persona.name}</div>
                <div class="persona-description">${persona.description}</div>
            `;

            personaCard.addEventListener('click', () => {
                this.selectPersona(key, personaCard);
            });

            // Keyboard support
            personaCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectPersona(key, personaCard);
                }
            });

            personaList.appendChild(personaCard);
        });
    }

    populatePersonaSelect() {
        const select = document.getElementById('selectedPersona');
        select.innerHTML = '<option value="">Choose a persona...</option>';

        Object.entries(this.personas).forEach(([key, persona]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = persona.name;
            select.appendChild(option);
        });
    }

    selectPersona(personaKey, cardElement) {
        // Mark manual theme override when user interacts
        localStorage.setItem('theme-manual-override', 'true');
        
        // Remove previous selection
        document.querySelectorAll('.persona-card').forEach(card => {
            card.classList.remove('selected');
            card.setAttribute('aria-selected', 'false');
        });

        // Add selection to clicked card
        cardElement.classList.add('selected');
        cardElement.setAttribute('aria-selected', 'true');
        this.selectedPersona = personaKey;

        // Update select dropdown
        document.getElementById('selectedPersona').value = personaKey;
    }

    renderScoringCriteria() {
        const container = document.getElementById('scoringCriteria');
        container.innerHTML = '';

        Object.entries(this.scoringCriteria).forEach(([key, criterion]) => {
            const criterionDiv = document.createElement('div');
            criterionDiv.className = 'criterion-item';
            criterionDiv.innerHTML = `
                <div class="criterion-name">${criterion.name}</div>
                <div class="criterion-weight">Weight: ${(criterion.weight * 100)}%</div>
            `;
            container.appendChild(criterionDiv);
        });
    }

    renderRecentIdeas(ideas) {
        const container = document.getElementById('recentIdeas');
        container.innerHTML = '';

        ideas.slice(0, 5).forEach(idea => {
            const ideaDiv = document.createElement('div');
            ideaDiv.className = 'recent-idea-item';
            ideaDiv.innerHTML = `
                <div class="idea-title">${idea.prompt.substring(0, 50)}...</div>
                <div class="idea-meta">
                    <span class="idea-persona">${idea.persona}</span>
                    ${idea.scores ? `<span class="idea-score">Score: ${idea.scores.weighted}</span>` : ''}
                </div>
            `;
            container.appendChild(ideaDiv);
        });
    }

    renderIdeasBoard(ideas) {
        const grid = document.getElementById('ideasGrid');
        grid.innerHTML = '';

        ideas.forEach(idea => {
            const ideaCard = this.createIdeaCard(idea);
            grid.appendChild(ideaCard);
        });
    }

    createIdeaCard(idea) {
        const card = document.createElement('div');
        card.className = 'idea-card';
        
        card.innerHTML = `
            <div class="idea-header">
                <span class="idea-persona">${idea.persona}</span>
                <div class="idea-actions">
                    <button class="action-btn" onclick="app.scoreIdea('${idea.id}')" aria-label="Score this idea">
                        <i class="fas fa-star"></i> Score
                    </button>
                    <button class="action-btn" onclick="app.shareIdea('${idea.id}')" aria-label="Share this idea">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
            </div>
            <div class="idea-content">
                <strong>Challenge:</strong> ${idea.prompt}<br><br>
                <strong>Generated Ideas:</strong><br>
                ${this.formatIdeaResponse(idea.response)}
            </div>
            ${idea.scores ? `
                <div class="idea-score">
                    <strong>Score:</strong> ${idea.scores.weighted}/5.0
                    <div class="score-breakdown">
                        ${Object.entries(idea.scores.individual).map(([criterion, score]) => 
                            `${this.scoringCriteria[criterion]?.name}: ${score}`
                        ).join(' • ')}
                    </div>
                </div>
            ` : ''}
        `;

        return card;
    }

    formatIdeaResponse(response) {
        return response
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    setupEventListeners() {
        // Generate Ideas
        document.getElementById('generateIdeas').addEventListener('click', () => {
            this.generateIdeas();
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Mind map controls
        document.getElementById('createMindmap')?.addEventListener('click', () => {
            this.createMindMap();
        });

        document.getElementById('expandMindmap')?.addEventListener('click', () => {
            this.expandMindMap();
        });

        // Persona select change
        document.getElementById('selectedPersona').addEventListener('change', (e) => {
            if (e.target.value) {
                const personaCard = document.querySelector(`[data-persona="${e.target.value}"]`);
                if (personaCard) {
                    this.selectPersona(e.target.value, personaCard);
                }
            }
        });

        this.setupModalControls();
    }

    // Rest of your existing methods remain unchanged...
    // (setupModalControls, setupSocketListeners, generateIdeas, etc.)

    setupModalControls() {
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        document.getElementById('submitScore')?.addEventListener('click', () => {
            this.submitScore();
        });
    }

    setupSocketListeners() {
        this.socket.on('newIdea', (idea) => {
            this.addIdeaToDisplay(idea);
        });

        this.socket.on('ideaScored', (data) => {
            this.updateIdeaScore(data.ideaId, data.scores);
        });

        this.socket.on('mindmapChanged', (data) => {
            this.updateMindMap(data);
        });
    }

    setupTabs() {
        // Initial tab setup is handled by CSS
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async generateIdeas() {
        const prompt = document.getElementById('brainstormPrompt').value.trim();
        const context = document.getElementById('context').value.trim();
        const persona = this.selectedPersona;

        if (!prompt) {
            alert('Please enter a challenge or topic to brainstorm about.');
            return;
        }

        if (!persona) {
            alert('Please select a creative persona.');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    context,
                    persona,
                    sessionId: this.currentSession
                })
            });

            const data = await response.json();

            if (data.success) {
                this.addIdeaToDisplay(data.idea);
                this.clearBrainstormForm();
            } else {
                alert(data.error || 'Failed to generate ideas');
            }
        } catch (error) {
            console.error('Error generating ideas:', error);
            alert('Error generating ideas. Please try again.');
        }

        this.hideLoading();
    }

    addIdeaToDisplay(idea) {
        const output = document.getElementById('ideasOutput');
        const ideaCard = this.createIdeaCard(idea);
        output.insertBefore(ideaCard, output.firstChild);

        this.loadSessionIdeas();
    }

    clearBrainstormForm() {
        document.getElementById('brainstormPrompt').value = '';
        document.getElementById('context').value = '';
    }

    scoreIdea(ideaId) {
        this.currentIdea = ideaId;
        this.showScoringModal();
    }

    showScoringModal() {
        const modal = document.getElementById('scoringModal');
        const form = document.getElementById('scoringForm');
        
        form.innerHTML = '';

        Object.entries(this.scoringCriteria).forEach(([key, criterion]) => {
            const criterionDiv = document.createElement('div');
            criterionDiv.className = 'scoring-criterion';
            criterionDiv.innerHTML = `
                <label for="score-${key}">${criterion.name} (Weight: ${(criterion.weight * 100)}%)</label>
                <input type="range" id="score-${key}" min="1" max="5" value="3" class="score-slider" aria-describedby="score-${key}-value">
                <span id="score-${key}-value" class="score-value">3</span>
            `;
            
            const slider = criterionDiv.querySelector('.score-slider');
            const valueSpan = criterionDiv.querySelector('.score-value');
            
            slider.addEventListener('input', () => {
                valueSpan.textContent = slider.value;
            });

            form.appendChild(criterionDiv);
        });

        modal.style.display = 'block';
    }

    async submitScore() {
        if (!this.currentIdea) return;

        const scores = {};
        Object.keys(this.scoringCriteria).forEach(key => {
            const slider = document.getElementById(`score-${key}`);
            scores[key] = parseInt(slider.value);
        });

        try {
            const response = await fetch('/api/score-idea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ideaId: this.currentIdea,
                    scores
                })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('scoringModal').style.display = 'none';
                this.loadSessionIdeas();
            } else {
                alert(data.error || 'Failed to score idea');
            }
        } catch (error) {
            console.error('Error scoring idea:', error);
            alert('Error scoring idea. Please try again.');
        }
    }

    createMindMap() {
        const topic = document.getElementById('mindmapTopic')?.value.trim();
        if (!topic) {
            alert('Please enter a central topic for the mind map.');
            return;
        }

        const canvas = document.getElementById('mindmapCanvas');
        if (canvas) {
            canvas.innerHTML = `
                <div class="mindmap-node central-node">
                    ${topic}
                </div>
                <div class="mindmap-message">
                    Click "AI Expand" to generate related topics
                </div>
            `;
        }
    }

    async expandMindMap() {
        const topic = document.getElementById('mindmapTopic')?.value.trim();
        if (!topic) {
            alert('Please create a mind map first.');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/mindmap-expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    currentBranches: []
                })
            });

            const data = await response.json();

            if (data.success) {
                this.renderMindMapBranches(data.branches);
            } else {
                alert(data.error || 'Failed to expand mind map');
            }
        } catch (error) {
            console.error('Error expanding mind map:', error);
            alert('Error expanding mind map. Please try again.');
        }

        this.hideLoading();
    }

    renderMindMapBranches(branches) {
        const canvas = document.getElementById('mindmapCanvas');
        if (!canvas) return;
        
        const existingMessage = canvas.querySelector('.mindmap-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        branches.forEach((branch, index) => {
            const branchNode = document.createElement('div');
            branchNode.className = 'mindmap-node branch-node';
            branchNode.textContent = branch;
            branchNode.style.position = 'absolute';
            branchNode.style.top = `${20 + (index * 60)}px`;
            branchNode.style.left = `${300 + (index % 2 === 0 ? 100 : -100)}px`;
            canvas.appendChild(branchNode);
        });
    }

    shareIdea(ideaId) {
        navigator.clipboard.writeText(`Check out this idea: ${window.location.origin}#idea-${ideaId}`)
            .then(() => alert('Idea link copied to clipboard!'))
            .catch(() => alert('Could not copy link'));
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    updateIdeaScore(ideaId, scores) {
        this.loadSessionIdeas();
    }

    updateMindMap(data) {
        console.log('Mind map updated:', data);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BrainstormingApp();
});
