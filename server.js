const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Server } = require('socket.io');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI with correct implementation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory storage for sessions (use database in production)
const sessions = new Map();
const ideas = new Map();

// Creative Personas Configuration
const PERSONAS = {
  innovator: {
    name: "The Innovator",
    description: "Focuses on breakthrough solutions and emerging technologies",
    prompt: "You are an innovative thinker who specializes in breakthrough solutions and cutting-edge technologies. Always think outside the box, consider emerging trends, and propose revolutionary ideas that could disrupt industries. Focus on feasibility while maintaining creative ambition."
  },
  critic: {
    name: "The Critical Thinker",
    description: "Analyzes ideas objectively and identifies potential challenges",
    prompt: "You are a critical analyst who evaluates ideas objectively. Your role is to identify potential challenges, risks, and weaknesses in proposed solutions. Provide constructive criticism that helps refine and improve ideas while maintaining a balanced perspective."
  },
  visionary: {
    name: "The Visionary",
    description: "Dreams big and imagines future possibilities",
    prompt: "You are a visionary who thinks about long-term impacts and future possibilities. Dream big, consider societal implications, and imagine how ideas could evolve over time. Focus on transformative potential and inspirational outcomes."
  },
  pragmatist: {
    name: "The Pragmatist",
    description: "Focuses on practical implementation and realistic solutions",
    prompt: "You are a pragmatic thinker who focuses on practical implementation and realistic solutions. Consider resource constraints, timeline feasibility, and step-by-step execution plans. Ensure ideas are actionable and achievable within reasonable parameters."
  },
  empath: {
    name: "The Empath",
    description: "Considers human needs, emotions, and user experience",
    prompt: "You are an empathetic designer who prioritizes human needs, emotions, and user experience. Consider how ideas affect different user groups, accessibility concerns, and emotional impact. Focus on creating solutions that truly serve people's needs."
  },
  economist: {
    name: "The Economist",
    description: "Evaluates financial viability and market potential",
    prompt: "You are a business analyst who evaluates financial viability and market potential. Consider cost-benefit analysis, revenue models, market size, and economic sustainability. Focus on creating commercially viable solutions."
  }
};

// Idea scoring criteria
const SCORING_CRITERIA = {
  creativity: { name: "Creativity", weight: 0.2 },
  feasibility: { name: "Feasibility", weight: 0.25 },
  impact: { name: "Potential Impact", weight: 0.25 },
  originality: { name: "Originality", weight: 0.15 },
  viability: { name: "Commercial Viability", weight: 0.15 }
};

// Generate ideas with persona
app.post('/api/brainstorm', async (req, res) => {
  try {
    const { prompt, persona, sessionId, context } = req.body;

    if (!prompt || !persona) {
      return res.status(400).json({ error: 'Prompt and persona are required' });
    }

    const selectedPersona = PERSONAS[persona];
    if (!selectedPersona) {
      return res.status(400).json({ error: 'Invalid persona selected' });
    }

    // Get the generative model using correct method
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fullPrompt = `${selectedPersona.prompt}

Context: ${context || 'General brainstorming session'}

Challenge/Topic: ${prompt}

Please provide 3-5 creative ideas or solutions. For each idea, include:
1. A clear title
2. A brief description (2-3 sentences)
3. Key benefits or advantages
4. One potential challenge to consider

Format your response as a structured list with clear separation between ideas.`;

    // Generate content using correct method
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();
    const ideaId = uuidv4();
    
    // Store the generated ideas
    const ideaData = {
      id: ideaId,
      sessionId: sessionId || 'default',
      persona: selectedPersona.name,
      prompt,
      response,
      timestamp: new Date(),
      scores: null
    };

    ideas.set(ideaId, ideaData);

    // Emit to all connected clients in the session
    if (sessionId) {
      io.to(sessionId).emit('newIdea', ideaData);
    }

    res.json({ 
      success: true, 
      idea: ideaData,
      persona: selectedPersona
    });

  } catch (error) {
    console.error('Error generating ideas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate ideas. Please check your API key and try again.' 
    });
  }
});

// Score ideas
app.post('/api/score-idea', async (req, res) => {
  try {
    const { ideaId, scores } = req.body;

    if (!ideaId || !scores) {
      return res.status(400).json({ error: 'Idea ID and scores are required' });
    }

    const idea = ideas.get(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Calculate weighted score
    let totalScore = 0;
    for (const [criterion, score] of Object.entries(scores)) {
      if (SCORING_CRITERIA[criterion]) {
        totalScore += score * SCORING_CRITERIA[criterion].weight;
      }
    }

    idea.scores = {
      individual: scores,
      weighted: Math.round(totalScore * 10) / 10,
      timestamp: new Date()
    };

    ideas.set(ideaId, idea);

    // Emit score update to session
    if (idea.sessionId) {
      io.to(idea.sessionId).emit('ideaScored', { ideaId, scores: idea.scores });
    }

    res.json({ success: true, scores: idea.scores });

  } catch (error) {
    console.error('Error scoring idea:', error);
    res.status(500).json({ success: false, error: 'Failed to score idea' });
  }
});

// Get session ideas
app.get('/api/session/:sessionId/ideas', (req, res) => {
  const { sessionId } = req.params;
  const sessionIdeas = Array.from(ideas.values())
    .filter(idea => idea.sessionId === sessionId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json({ success: true, ideas: sessionIdeas });
});

// Get personas
app.get('/api/personas', (req, res) => {
  res.json({ success: true, personas: PERSONAS });
});

// Get scoring criteria
app.get('/api/scoring-criteria', (req, res) => {
  res.json({ success: true, criteria: SCORING_CRITERIA });
});

// Mind mapping suggestions
app.post('/api/mindmap-expand', async (req, res) => {
  try {
    const { topic, currentBranches } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are helping expand a mind map for the topic: "${topic}"

Current branches already exist: ${currentBranches ? currentBranches.join(', ') : 'None'}

Generate 5 new, unique branches/subtopics that would logically connect to this main topic. 
Make sure they don't duplicate existing branches.
Format as a simple list, one per line, with just the branch name (2-4 words each).`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const branches = response.split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 5);

    res.json({ success: true, branches });

  } catch (error) {
    console.error('Error expanding mind map:', error);
    res.status(500).json({ success: false, error: 'Failed to expand mind map' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'AI Brainstorming Server is running!', timestamp: new Date() });
});

// Socket.IO for real-time collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('mindmapUpdate', (data) => {
    socket.to(data.sessionId).emit('mindmapChanged', data);
  });

  socket.on('ideaDiscussion', (data) => {
    socket.to(data.sessionId).emit('newDiscussion', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`AI Brainstorming Server running on port ${PORT}`);
  console.log(`Using Gemini AI model: gemini-1.5-flash`);
});
