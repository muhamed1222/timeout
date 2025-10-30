// Vercel Serverless Function для ShiftManager API
import express from 'express';

let app;
let initialized = false;

// Инициализация Express app
async function initializeApp() {
  if (initialized) return app;
  
  app = express();
  
  // Middleware для парсинга JSON
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // CORS middleware для Vercel
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Telegram-Init-Data');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Логирование запросов
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
  
  try {
    // Импортируем скомпилированные роуты
    const { registerRoutes } = await import('../dist/server/routes.js');
    const httpServer = await registerRoutes(app);
    initialized = true;
    console.log('Routes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize routes:', error);
    console.error('Error details:', error.stack || error);
    throw error;
  }
  
  return app;
}

export default async function handler(req, res) {
  try {
    const expressApp = await initializeApp();
    
    // Передаем запрос в Express app
    expressApp(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};