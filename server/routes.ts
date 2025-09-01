import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "./passport-config";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
// import './exchange'; // Initialize exchange service - Temporarily disabled
import {
  registerSchema,
  insertItemSchema,
  insertCommunityPostSchema,
  insertCommentSchema,
  type User,
  type InsertItem,
  type InsertCommunityPost,
  type InsertComment
} from "@shared/schema";
import { z } from "zod";

// --- TypeScript 타입 확장 ---
declare global {
  namespace Express {
    export interface Request {
      user?: User;
    }
  }
}
// -------------------------

const serverLoginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.id);
    if (!user) return res.status(403).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.set('trust proxy', 1);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: app.get('env') === 'production' }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Database connection test and seeding
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Testing database connection...');
      // Simple test query to check connection
      const testResult = await storage.getItems();
      console.log('Database connection successful');
      await seedDatabase();
    } catch (error) {
      console.log("Database connection failed or seeding failed:", (error as Error).message);
      console.log('Application will continue but database features may not work');
    }
  }

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth' && message.token) {
          const decoded = jwt.verify(message.token, JWT_SECRET) as any;
          clients.set(decoded.id, ws);
        } else if (message.type === 'join_room') {
          (ws as any).roomId = message.roomId;
        }
      } catch (e) { console.error('WS message error:', e); }
    });
    ws.on('close', () => {
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
    });
  });

  // OAuth Routes
  const handleOAuthCallback = (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user) return res.redirect('/auth/login?error=auth_failed');
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const userPayload = encodeURIComponent(JSON.stringify({ ...user, password: undefined }));
    res.redirect(`/?token=${token}&user=${userPayload}`);
  };

  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/login' }), handleOAuthCallback);
  app.get('/api/auth/kakao', passport.authenticate('kakao'));
  app.get('/api/auth/kakao/callback', passport.authenticate('kakao', { failureRedirect: '/auth/login' }), handleOAuthCallback);
  app.get('/api/auth/naver', passport.authenticate('naver'));
  app.get('/api/auth/naver/callback', passport.authenticate('naver', { failureRedirect: '/auth/login' }), handleOAuthCallback);

  // Auth Routes
  app.post('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const existingUser = await storage.getUserByEmail(email);
      res.json({ available: !existingUser });
    } catch (error) {
      console.log('Database error in /api/auth/check-email:', (error as Error).message);
      res.status(500).json({ error: 'Email check failed. Please try again later.' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) return res.status(400).json({ error: 'User already exists' });
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // fullName이 비어있으면 username을 사용
      const userData = {
        ...validatedData,
        fullName: validatedData.fullName || validatedData.username,
        password: hashedPassword
      };
      
      const user = await storage.createUser(userData);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.log('Database error in /api/auth/register:', (error as Error).message);
      res.status(500).json({ error: 'Registration failed. Please try again later.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = serverLoginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email) || await storage.getUserByUsername(validatedData.email);
      if (!user || !await bcrypt.compare(validatedData.password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.log('Database error in /api/auth/login:', (error as Error).message);
      res.status(500).json({ error: 'Login failed. Please try again later.' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req, res) => res.json({ user: req.user }));

  // User Routes
  app.put('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user!.id !== req.params.id) return res.status(403).json({ error: 'Access denied' });
    const { currentPassword, newPassword, ...updateData } = req.body;
    if (newPassword) {
      if (!currentPassword || !await bcrypt.compare(currentPassword, req.user!.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }
    const updatedUser = await storage.updateUser(req.user!.id, updateData);
    res.json(updatedUser);
  });

  app.get('/api/users/stats', authenticateToken, async (req, res) => res.json(await storage.getUserStats(req.user!.id)));
  app.get('/api/users/items', authenticateToken, async (req, res) => res.json(await storage.getUserItems(req.user!.id)));

  // Item Routes
  app.get('/api/items', async (req, res) => {
    try {
      const { school, country, category, search, page = '0', limit = '10' } = req.query;
      const items = await storage.getItemsWithFilters({
        school: school as string, country: country as string, category: category as string,
        search: search as string, page: parseInt(page as string), limit: parseInt(limit as string)
      });
      res.json(items);
    } catch (error) {
      console.log('Database error in /api/items:', (error as Error).message);
      res.json([]); // Return empty array if database is not available
    }
  });

  app.get('/api/items/:id', async (req, res) => {
    const item = await storage.getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await storage.incrementItemViews(req.params.id);
    res.json(item);
  });

  app.post('/api/items', authenticateToken, async (req, res) => {
    const itemData = req.body as Omit<InsertItem, 'sellerId'>;
    const validatedData = insertItemSchema.parse({ ...itemData, sellerId: req.user!.id });
    const item = await storage.createItem(validatedData);
    res.status(201).json(item);
  });

  app.put('/api/items/:id', authenticateToken, async (req, res) => {
    const item = await storage.getItem(req.params.id);
    if (!item || item.sellerId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });
    res.json(await storage.updateItemStatus(req.params.id, req.body.status));
  });

  // Favorite & Report Routes
  app.get('/api/favorites', authenticateToken, async (req, res) => res.json(await storage.getUserFavorites(req.user!.id)));
  app.post('/api/favorites', authenticateToken, async (req, res) => res.status(201).json(await storage.addFavorite(req.user!.id, req.body.itemId)));
  app.delete('/api/favorites/:itemId', authenticateToken, async (req, res) => {
    await storage.removeFavorite(req.user!.id, req.params.itemId);
    res.status(204).send();
  });
  app.post('/api/items/:id/toggle-like', authenticateToken, async (req, res) => {
    res.json({ isLiked: await storage.toggleItemLike(req.params.id, req.user!.id) });
  });
  app.post('/api/items/:id/report', authenticateToken, async (req, res) => {
    const { reason, description } = req.body;
    const report = await storage.createReport({ itemId: req.params.id, reason, description, reporterId: req.user!.id });
    res.status(201).json({ message: '신고가 접수되었습니다', report });
  });

  // Community Routes
  app.get('/api/community/posts', async (req, res) => {
    const { category, country } = req.query;
    res.json(await storage.getCommunityPostsByQuery({ category: category as string, country: country as string }));
  });

  app.get('/api/community/posts/:id', async (req, res) => {
    const post = await storage.getCommunityPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await storage.incrementCommunityPostViews(req.params.id);
    res.json(post);
  });

  app.post('/api/community/posts', authenticateToken, async (req, res) => {
    const postData = insertCommunityPostSchema.parse({ ...req.body, authorId: req.user!.id });
    const post = await storage.createCommunityPost(postData as InsertCommunityPost);
    res.status(201).json(post);
  });

  app.get('/api/community/posts/:id/comments', async (req, res) => res.json(await storage.getComments(req.params.id)));

  app.post('/api/community/posts/:id/comments', authenticateToken, async (req, res) => {
    const commentData = insertCommentSchema.parse({ ...req.body, postId: req.params.id, authorId: req.user!.id });
    const comment = await storage.createComment(commentData as InsertComment & { authorId: string });
    const post = await storage.getCommunityPost(req.params.id);
    if (post && post.authorId !== req.user!.id) {
      await storage.createNotification({
        userId: post.authorId, type: 'new_comment',
        content: `${req.user!.fullName}님이 게시글에 댓글을 남겼습니다.`,
        link: `/community/post/${req.params.id}`
      });
    }
    res.status(201).json(comment);
  });

  // Message Routes
  app.get('/api/messages/unread-count', authenticateToken, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      console.log('Database error in /api/messages/unread-count:', (error as Error).message);
      res.json({ count: 0 }); // Return 0 if database is not available
    }
  });

  // ... (Admin, Chat, and other routes can be added here following the same pattern)

  return httpServer;
}