require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('./config/passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRoutes           = require('./routes/authRoutes');
const googleAuthRoutes     = require('./routes/googleAuthRoutes');
const userRoutes           = require('./routes/userRoutes');
const lmsRoutes            = require('./routes/lmsRoutes');
const linkedAccountsRoutes = require('./routes/linkedAccountsRoutes');
const courseRoutes         = require('./routes/courseRoutes');
const assignmentRoutes     = require('./routes/assignmentRoutes');
const gradeRoutes          = require('./routes/gradeRoutes');
const calendarRoutes       = require('./routes/calendarRoutes');
const notificationRoutes   = require('./routes/notificationRoutes');
const aiRoutes             = require('./routes/aiRoutes');
const searchRoutes         = require('./routes/searchRoutes');
const scheduleRoutes       = require('./routes/scheduleRoutes');
const focusRoutes          = require('./routes/focusRoutes');
const syllabusRoutes       = require('./routes/syllabusRoutes');
const flashcardRoutes      = require('./routes/flashcardRoutes');
const errorHandler         = require('./middleware/errorHandler');

const app = express();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many AI requests. Slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(passport.initialize());

// ── Swagger docs (dev only) ───────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: { title: 'Classerize API', version: '1.0.0', description: 'LMS aggregation platform API' },
        servers: [{ url: process.env.API_URL || 'http://localhost:5000' }],
        components: {
            securitySchemes: {
                cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
            },
        },
        security: [{ cookieAuth: [] }],
    },
    apis: ['./routes/*.js', './controllers/*.js'],
});
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            authLimiter);
app.use('/api/users/register',  authLimiter);
app.use('/api/auth',            authRoutes);
app.use('/api/auth',            googleAuthRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/lms',             lmsRoutes);
app.use('/api/linked-accounts', linkedAccountsRoutes);
app.use('/api/courses',         courseRoutes);
app.use('/api/assignments',     assignmentRoutes);
app.use('/api/grades',          gradeRoutes);
app.use('/api/calendar',        calendarRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/ai',              aiLimiter);
app.use('/api/ai',              aiRoutes);
app.use('/api/search',          searchRoutes);
app.use('/api/schedule',        scheduleRoutes);
app.use('/api/focus',           focusRoutes);
app.use('/api/syllabus',        syllabusRoutes);
app.use('/api/flashcards',      flashcardRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Error handler (last) ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
