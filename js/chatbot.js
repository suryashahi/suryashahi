// ===== Smart Portfolio Chatbot =====
document.addEventListener('DOMContentLoaded', () => {
    const bubble = document.getElementById('chatbotBubble');
    const tooltip = document.getElementById('chatbotTooltip');
    const chatWindow = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatbotClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatbotMessages');
    const badge = document.querySelector('.chatbot-badge');

    let isOpen = false;

    // ===== Surya's Full Knowledge Base =====
    const profile = {
        name: "Surya Bahadur Shahi",
        shortName: "Surya",
        role: "Full Stack Developer",
        email: "suryashahi153@gmail.com",
        location: "India",
        availability: "Open to Work",
        experience: "2+ years",
        projectCount: "10+",
        bio: "A passionate full stack developer specializing in modern web development with a growing focus on Artificial Intelligence. Loves building scalable, user-friendly web applications and exploring cutting-edge AI technologies including generative models and LLM integration.",
        frontend: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"],
        backend: ["Node.js", "Express.js", "Python", "FastAPI", "REST APIs", "GraphQL"],
        database: ["MongoDB", "PostgreSQL", "MySQL", "Redis", "Firebase"],
        tools: ["Git", "Docker", "AWS", "Linux", "Figma", "VS Code"],
        ai: ["TensorFlow", "PyTorch", "LangChain", "OpenAI API", "Hugging Face"],
        projects: [
            { name: "E-Commerce Platform", tech: "React, Node.js, MongoDB", desc: "Full-featured e-commerce app with authentication, product management, cart, and payments." },
            { name: "AI Chatbot Assistant", tech: "Python, LangChain, OpenAI", desc: "Intelligent chatbot powered by LLMs for Q&A, document summarization, and coding help." },
            { name: "Project Management Tool", tech: "Next.js, TypeScript, PostgreSQL", desc: "Collaborative project management with real-time updates, task boards, and team features." },
            { name: "Weather Dashboard", tech: "React, API, Tailwind", desc: "Beautiful weather app with real-time data, 7-day forecast, and interactive maps." },
            { name: "Developer Blog", tech: "Next.js, MDX, Vercel", desc: "Personal blog for writing about web development, AI, and tech tutorials." },
            { name: "Video Chat App", tech: "WebRTC, Socket.io, Node.js", desc: "Real-time video conferencing with peer-to-peer connections and screen sharing." }
        ],
        timeline: [
            { period: "Nov - Dec 2025", role: "AI/ML Intern", place: "Nexoris Solution" },
            { period: "Sep - Nov 2025", role: "Intern", place: "Infosys Springboard (Virtual Internship 6.0)" },
            { period: "Jun - Jul 2025", role: "Web Developer Intern", place: "Amypo Technologies Pvt Ltd, Coimbatore" }
        ],
        education: [
            { period: "2023 - Present", degree: "B.E. Computer Science & Engineering (AI & ML)", school: "Sri Ramakrishna Engineering College (SREC), Coimbatore" },
            { period: "2021 - 2023", degree: "Higher Secondary (+2, Science)", school: "Liverpool International College, Kathmandu" },
            { period: "2017 - 2021", degree: "Secondary Education (Grade 8-10)", school: "United Academy, Kailali" },
            { period: "2010 - 2017", degree: "Primary Education (Grade 1-7)", school: "Trinity English Boarding School, Tikapur, Kailali" }
        ]
    };

    // ===== Helper =====
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ===== Intent Detection with Scored Matching =====
    const intents = [
        {
            triggers: ["hello", "hi", "hey", "hola", "howdy", "sup", "what's up", "good morning", "good evening", "good afternoon", "namaste", "yo"],
            handler: () => pick([
                "Hey there! 👋 I'm Surya's virtual assistant. I can tell you about his skills, projects, experience, or how to reach him. What would you like to know?",
                "Hello! 😊 Welcome to Surya's portfolio! Ask me anything — skills, projects, contact info, you name it!",
                "Hi! 👋 Great to see you here! What are you curious about? I know everything about Surya."
            ])
        },
        {
            triggers: ["who is surya", "who are you", "tell me about surya", "about surya", "who is he", "introduce", "tell me about yourself", "about yourself", "who r u"],
            handler: () => `<strong>${profile.name}</strong> is a <strong>${profile.role}</strong> based in ${profile.location} with ${profile.experience} of experience.<br><br>${profile.bio}<br><br>He's currently <strong>${profile.availability}</strong> — feel free to reach out! 🚀`
        },
        {
            triggers: ["your name", "what is your name", "what's your name"],
            handler: () => `I'm the virtual assistant for <strong>${profile.name}</strong>! He's a ${profile.role} based in ${profile.location}. How can I help you today?`
        },
        {
            triggers: ["skills", "what can he do", "what does he know", "technologies", "tech stack", "what technologies", "what he knows", "abilities", "expertise"],
            handler: () =>
                `Surya has a wide range of skills across the full stack!<br><br>` +
                `🎨 <strong>Frontend:</strong> ${profile.frontend.join(", ")}<br>` +
                `⚙️ <strong>Backend:</strong> ${profile.backend.join(", ")}<br>` +
                `🗄️ <strong>Database:</strong> ${profile.database.join(", ")}<br>` +
                `🛠️ <strong>Tools:</strong> ${profile.tools.join(", ")}<br>` +
                `🤖 <strong>AI/ML:</strong> ${profile.ai.join(", ")}<br><br>` +
                `Want details on any specific area?`
        },
        {
            triggers: ["frontend", "front-end", "front end", "react", "next.js", "nextjs", "html", "css", "tailwind", "ui", "user interface"],
            handler: () => `On the frontend, Surya works with <strong>${profile.frontend.join(", ")}</strong>. He's particularly strong in React and Next.js, building responsive, performant user interfaces with modern design patterns. 🎨`
        },
        {
            triggers: ["backend", "back-end", "back end", "node", "express", "server", "api", "fastapi", "graphql", "rest"],
            handler: () => `For backend development, Surya is proficient in <strong>${profile.backend.join(", ")}</strong>. He builds robust, scalable APIs and server-side applications. ⚙️`
        },
        {
            triggers: ["database", "db", "mongo", "postgres", "mysql", "redis", "firebase", "data storage", "sql", "nosql"],
            handler: () => `Surya works with several databases: <strong>${profile.database.join(", ")}</strong>. He's comfortable with both SQL and NoSQL solutions depending on project needs. 🗄️`
        },
        {
            triggers: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "langchain", "openai", "llm", "hugging face", "gpt"],
            handler: () => `Surya is actively exploring AI/ML technologies including <strong>${profile.ai.join(", ")}</strong>. He's passionate about integrating LLMs, generative models, and AI-powered features into web applications. 🤖`
        },
        {
            triggers: ["tools", "devops", "git", "docker", "aws", "linux", "figma", "vs code", "workflow", "deployment"],
            handler: () => `Surya uses industry-standard tools: <strong>${profile.tools.join(", ")}</strong>. He follows best practices with version control, containerization, and cloud deployment. 🛠️`
        },
        {
            triggers: ["projects", "portfolio", "what has he built", "what did he build", "work", "show me projects", "his work", "show projects", "what he made"],
            handler: () => {
                let r = `Surya has built <strong>${profile.projectCount} projects</strong>! Here are the highlights:<br><br>`;
                profile.projects.forEach((p, i) => {
                    r += `${i + 1}. <strong>${p.name}</strong> <em>(${p.tech})</em><br>&nbsp;&nbsp;&nbsp;${p.desc}<br><br>`;
                });
                r += `Want to know more about any specific project?`;
                return r;
            }
        },
        {
            triggers: ["ecommerce", "e-commerce", "shopping", "online store"],
            handler: () => `The <strong>E-Commerce Platform</strong> is built with React, Node.js, and MongoDB. It features user authentication, product management, a shopping cart, and payment integration — a full online shopping experience! 🛒`
        },
        {
            triggers: ["chatbot project", "ai chatbot", "llm project"],
            handler: () => `The <strong>AI Chatbot Assistant</strong> uses Python, LangChain, and OpenAI. It's an intelligent chatbot that can answer questions, summarize documents, and assist with coding — powered by LLMs! 🤖`
        },
        {
            triggers: ["project management", "task board", "kanban", "management tool"],
            handler: () => `The <strong>Project Management Tool</strong> is built with Next.js, TypeScript, and PostgreSQL. It features real-time updates, task boards, team management, and progress tracking! 📋`
        },
        {
            triggers: ["weather", "forecast"],
            handler: () => `The <strong>Weather Dashboard</strong> uses React, external APIs, and Tailwind CSS. It shows real-time weather, 7-day forecasts, interactive maps, and location-based alerts! 🌦️`
        },
        {
            triggers: ["blog", "writing", "articles", "tutorials"],
            handler: () => `The <strong>Developer Blog</strong> is built with Next.js and MDX on Vercel. Surya writes about web development, AI, and tech tutorials. ✍️`
        },
        {
            triggers: ["video chat", "video call", "webrtc", "conferencing", "video app"],
            handler: () => `The <strong>Video Chat App</strong> uses WebRTC, Socket.io, and Node.js — real-time video conferencing with peer-to-peer connections, screen sharing, and text chat! 📹`
        },
        {
            triggers: ["experience", "work history", "timeline", "career", "job", "internship", "background"],
            handler: () => {
                let r = `Here's Surya's professional experience:<br><br>`;
                profile.timeline.forEach(t => {
                    r += `📌 <strong>${t.role}</strong> — ${t.place} (${t.period})<br>`;
                });
                r += `<br>Visit the About page for the full details!`;
                return r;
            }
        },
        {
            triggers: ["education", "university", "college", "study", "qualification", "degree", "school", "academic"],
            handler: () => {
                let r = `Here's Surya's educational background:<br><br>`;
                profile.education.forEach(e => {
                    r += `🎓 <strong>${e.degree}</strong><br>&nbsp;&nbsp;&nbsp;&nbsp;${e.school} (${e.period})<br><br>`;
                });
                r += `He's currently pursuing his B.E. in CS (AI & ML) at SREC, Coimbatore! 📚`;
                return r;
            }
        },
        {
            triggers: ["contact", "reach", "email", "mail", "hire", "get in touch", "connect", "message him", "talk to surya", "how to reach"],
            handler: () => `You can reach Surya at:<br><br>📧 <strong>Email:</strong> ${profile.email}<br>🐙 <strong>GitHub:</strong> linked in the contact section<br>💼 <strong>LinkedIn:</strong> also linked below<br><br>Or fill out the contact form on the homepage! He's currently <strong>${profile.availability}</strong>. 😊`
        },
        {
            triggers: ["where", "location", "based", "country", "city", "live", "from where"],
            handler: () => `Surya is based in <strong>${profile.location}</strong>. He's open to both local and remote opportunities! 🌏`
        },
        {
            triggers: ["available", "hire", "freelance", "open to work", "looking for", "recruit", "hiring"],
            handler: () => `Yes! Surya is currently <strong>${profile.availability}</strong> 🟢. He's open to full-time roles, freelance projects, and collaborations. Reach out at <strong>${profile.email}</strong>!`
        },
        {
            triggers: ["resume", "cv", "download", "pdf"],
            handler: () => `You can download Surya's CV by clicking the <strong>"Download CV"</strong> button on the homepage. It has his full professional details! 📄`
        },
        {
            triggers: ["python"],
            handler: () => `Surya uses Python extensively for backend (FastAPI), AI/ML (TensorFlow, PyTorch, LangChain), and automation. It's one of his strongest languages! 🐍`
        },
        {
            triggers: ["javascript", "typescript"],
            handler: () => `JavaScript & TypeScript are at the core of Surya's work — React, Next.js, Node.js, Express, the entire web stack. TypeScript is his go-to for type-safe, maintainable code. ⚡`
        },
        {
            triggers: ["thanks", "thank you", "thx", "appreciate", "helpful", "great", "awesome", "nice", "cool", "good"],
            handler: () => pick([
                "You're welcome! 😊 Feel free to ask if you need anything else!",
                "Happy to help! 🙌 Don't hesitate to ask more questions.",
                `Glad I could help! If you'd like to reach Surya directly, email him at ${profile.email} 📧`
            ])
        },
        {
            triggers: ["bye", "goodbye", "see you", "later", "take care", "cya", "gtg"],
            handler: () => pick([
                "Goodbye! 👋 Thanks for visiting Surya's portfolio!",
                "See you later! 😊 Don't forget to check the projects page!",
                `Take care! 👋 Feel free to come back anytime or email ${profile.email}`
            ])
        },
        {
            triggers: ["how old", "age", "birthday", "born"],
            handler: () => `I don't have Surya's exact age, but he's a CS student who started his dev journey around 2022. You can ask him directly at ${profile.email}! 😊`
        },
        {
            triggers: ["hobby", "hobbies", "interests", "free time", "fun", "like to do", "passion"],
            handler: () => `Beyond coding, Surya is passionate about exploring new AI technologies, building side projects, writing about tech, and continuous learning. He loves turning innovative ideas into working apps! 🚀`
        },
        {
            triggers: ["strength", "strong", "best at", "specializ", "expert", "good at"],
            handler: () =>
                `Surya's key strengths:<br><br>` +
                `💪 <strong>Full Stack Development</strong> — end-to-end app building<br>` +
                `🧠 <strong>AI Integration</strong> — embedding LLMs and ML into apps<br>` +
                `🎨 <strong>UI/UX</strong> — clean, user-friendly interfaces<br>` +
                `📐 <strong>Problem Solving</strong> — tackling complex challenges<br>` +
                `🔄 <strong>Fast Learner</strong> — always up-to-date with latest tech`
        },
        {
            triggers: ["collaborate", "work together", "team up", "partnership", "together", "join"],
            handler: () => `Surya loves collaborating! Whether it's open source, freelance, or a startup idea — he's open to exciting opportunities. Reach out at <strong>${profile.email}</strong>! 🤝`
        },
        {
            triggers: ["joke", "funny", "humor", "laugh"],
            handler: () => pick([
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😄",
                "A developer's favorite hangout place? Foo Bar! 😂",
                "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😄",
                "There are only 10 types of people — those who understand binary and those who don't! 🤓"
            ])
        },
        {
            triggers: ["services", "what can you do for me", "what do you offer", "offer"],
            handler: () =>
                `Surya offers professional services in:<br><br>` +
                `🌐 <strong>Web Development</strong> — full stack apps with React, Next.js, Node.js<br>` +
                `🤖 <strong>AI Solutions</strong> — chatbots, LLM integration, ML models<br>` +
                `📱 <strong>Responsive Design</strong> — mobile-first, beautiful UIs<br>` +
                `🔌 <strong>API Development</strong> — REST & GraphQL backends<br><br>` +
                `Interested? Contact him at <strong>${profile.email}</strong>!`
        },
        {
            triggers: ["how are you", "how r u", "how you doing"],
            handler: () => pick([
                "I'm doing great, thanks for asking! 😊 How can I help you learn about Surya?",
                "I'm running smoothly! 🤖 Ready to answer all your questions about Surya.",
                "All good on my end! Ask me anything about Surya's skills, projects, or experience!"
            ])
        },
        {
            triggers: ["what can i ask", "help", "what do you know", "options", "menu"],
            handler: () =>
                `Here's everything I can help with:<br><br>` +
                `👤 <strong>"Who is Surya?"</strong> — learn about him<br>` +
                `🛠️ <strong>"What are his skills?"</strong> — tech stack<br>` +
                `💼 <strong>"Show me projects"</strong> — portfolio<br>` +
                `📋 <strong>"Experience"</strong> — career timeline<br>` +
                `📧 <strong>"Contact"</strong> — how to reach him<br>` +
                `🏆 <strong>"Strengths"</strong> — what he's best at<br>` +
                `🎯 <strong>"Services"</strong> — what he offers<br>` +
                `🤪 <strong>"Tell me a joke"</strong> — just for fun!<br><br>` +
                `Just type naturally — I understand questions in many ways!`
        }
    ];

    function detectIntent(input) {
        const lower = input.toLowerCase().trim();
        let bestMatch = null;
        let bestScore = 0;

        for (const intent of intents) {
            let score = 0;
            for (const trigger of intent.triggers) {
                if (lower.includes(trigger)) {
                    score += trigger.length + (lower === trigger ? 10 : 0);
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = intent;
            }
        }
        return bestMatch;
    }

    function generateResponse(input) {
        const intent = detectIntent(input);
        if (intent) return intent.handler();

        const lower = input.toLowerCase();
        if (lower.length < 3) {
            return "Could you tell me a bit more? I can help with Surya's skills, projects, experience, or contact details! 😊";
        }
        if (lower.includes("?")) {
            return `Great question! I might not have the exact answer, but I can tell you about Surya's <strong>skills, projects, experience</strong>, or <strong>contact info</strong>. Or email him directly at <strong>${profile.email}</strong>! 💬`;
        }
        return pick([
            `I appreciate your message! Try asking about Surya's <strong>skills</strong>, <strong>projects</strong>, <strong>experience</strong>, or <strong>contact details</strong>. Type <strong>"help"</strong> to see all topics! 🎯`,
            `Hmm, I'm not sure about that one. But I know a lot about Surya! Try:<br>• What are his skills?<br>• Show me his projects<br>• How to contact him?<br>• Tell me about his experience`,
            `I'm best at answering questions about Surya! Type <strong>"help"</strong> to see everything I can tell you about. 😊`
        ]);
    }

    // ===== Typing Indicator =====
    function showTyping() {
        const el = document.createElement('div');
        el.className = 'chat-message bot';
        el.id = 'typingIndicator';
        el.innerHTML = '<div class="message-bubble" style="display:flex;gap:4px;padding:14px 20px;"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        showTyping();

        const response = generateResponse(text);
        const delay = Math.min(500 + response.length * 1.5, 1800);

        setTimeout(() => {
            hideTyping();
            addMessage(response, 'bot');
        }, delay);
    }

    // ===== Events =====
    setTimeout(() => {
        if (tooltip) tooltip.classList.remove('hidden');
    }, 2000);

    bubble.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            chatWindow.classList.add('active');
            tooltip.classList.add('hidden');
            badge.style.display = 'none';
            chatInput.focus();
        } else {
            chatWindow.classList.remove('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        isOpen = false;
        chatWindow.classList.remove('active');
    });

    chatSend.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
