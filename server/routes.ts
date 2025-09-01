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
    
    // 사용자가 존재하지 않으면 (삭제된 경우) 401 에러로 처리
    if (!user) {
      return res.status(401).json({ 
        error: 'User account not found or has been deleted',
        forceLogout: true 
      });
    }
    
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
    const user = req.user as User & { needsAdditionalInfo?: boolean };
    if (!user) return res.redirect('/auth/login?error=auth_failed');
    
    console.log('🔍 OAuth 콜백 사용자 정보:', { 
      id: user.id, 
      email: user.email, 
      school: user.school, 
      country: user.country, 
      needsAdditionalInfo: user.needsAdditionalInfo,
      authProvider: user.authProvider 
    });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const userPayload = encodeURIComponent(JSON.stringify({ ...user, password: undefined }));
    
    // Check if user needs to complete registration (school/country info)
    const needsInfo = user.needsAdditionalInfo || !user.school || !user.country || user.school === '' || user.country === '';
    console.log('🔍 추가 정보 필요 여부:', needsInfo);
    
    if (needsInfo) {
      console.log('➡️ 회원가입 완료 페이지로 리다이렉트');
      res.redirect(`/auth/complete-registration?token=${token}&user=${userPayload}`);
    } else {
      console.log('➡️ 홈페이지로 리다이렉트');
      res.redirect(`/?token=${token}&user=${userPayload}`);
    }
  };

  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/login?error=auth_failed' }), handleOAuthCallback);
  app.get('/api/auth/kakao', passport.authenticate('kakao'));
  app.get('/api/auth/kakao/callback', (req, res, next) => {
    passport.authenticate('kakao', (err, user) => {
      if (err) {
        if (err.message === '삭제된 계정입니다.') {
          return res.redirect('/auth/login?error=deleted_account');
        }
        return res.redirect('/auth/login?error=auth_failed');
      }
      if (!user) {
        return res.redirect('/auth/login?error=auth_failed');
      }
      req.user = user;
      handleOAuthCallback(req, res);
    })(req, res, next);
  });
  app.get('/api/auth/naver', passport.authenticate('naver'));
  app.get('/api/auth/naver/callback', passport.authenticate('naver', { failureRedirect: '/auth/login?error=auth_failed' }), handleOAuthCallback);

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

  // === 회원가입 API ===
  // 클라이언트에서 온 회원가입 데이터를 처리합니다
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('🔄 회원가입 요청 데이터:', req.body);
      
      // 1️⃣ 클라이언트 데이터를 서버 스키마에 맞게 변환
      // 프론트엔드에서는 nickname을 보내지만, 데이터베이스에서는 username 필드를 사용
      const transformedData = {
        email: req.body.email,
        username: req.body.nickname || req.body.username,  // nickname 또는 username 사용
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        fullName: req.body.nickname || req.body.username || "",  // fullName을 nickname과 동일하게 설정
        school: req.body.school || "",  // 선택사항이므로 기본값 설정
        country: req.body.country || "",  // 선택사항이므로 기본값 설정
      };
      
      // username이 여전히 없다면 오류
      if (!transformedData.username) {
        console.log('❌ nickname/username이 누락됨');
        return res.status(400).json({ 
          error: 'Nickname is required',
          details: [{ message: 'Nickname is required', path: ['nickname'] }]
        });
      }
      
      console.log('🔄 변환된 데이터:', transformedData);
      
      // 2️⃣ 데이터 유효성 검사
      const validatedData = registerSchema.parse(transformedData);
      console.log('✅ 데이터 검증 완료');
      
      // 3️⃣ 이메일 중복 확인
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('❌ 이미 존재하는 이메일:', validatedData.email);
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // 4️⃣ 비밀번호 해싱 (보안을 위해 암호화)
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      console.log('✅ 비밀번호 해싱 완료');
      
      // 5️⃣ 사용자 데이터 준비
      const userData = {
        ...validatedData,
        password: hashedPassword,  // 해싱된 비밀번호로 교체
        fullName: validatedData.fullName || validatedData.username,  // fullName 기본값 설정
      };
      
      console.log('🔄 최종 사용자 데이터 생성 완료');
      
      // 6️⃣ 데이터베이스에 사용자 생성
      const user = await storage.createUser(userData);
      console.log('✅ 데이터베이스에 사용자 생성 완료:', user.id);
      
      // 7️⃣ JWT 토큰 생성 (로그인 상태 유지용)
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      console.log('✅ JWT 토큰 생성 완료');
      
      // 8️⃣ 성공 응답 (비밀번호는 제외하고 전송)
      res.json({ 
        token, 
        user: { ...user, password: undefined }  // 보안상 비밀번호는 클라이언트에 전송하지 않음
      });
      
    } catch (error) {
      console.error('❌ 회원가입 처리 중 오류:', error);
      console.log('Database error in /api/auth/register:', (error as Error).message);
      
      // 검증 오류인 경우 상세한 오류 메시지 전송
      if (error instanceof z.ZodError) {
        console.log('❌ 데이터 검증 실패:', error.errors);
        return res.status(400).json({ 
          error: 'Invalid data provided', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Registration failed. Please try again later.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = serverLoginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email) || await storage.getUserByUsername(validatedData.email);
      
      if (!user) {
        return res.status(401).json({ 
          error: '존재하지 않는 계정입니다. 이메일 또는 닉네임을 확인해주세요.' 
        });
      }
      
      if (!await bcrypt.compare(validatedData.password, user.password)) {
        return res.status(401).json({ 
          error: '비밀번호가 올바르지 않습니다. 다시 확인해주세요.' 
        });
      }
      
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.log('Database error in /api/auth/login:', (error as Error).message);
      res.status(500).json({ error: 'Login failed. Please try again later.' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req, res) => res.json({ user: req.user }));

  // OAuth Registration Completion
  app.post('/api/auth/complete-oauth-registration', authenticateToken, async (req, res) => {
    try {
      const { school, country } = req.body;
      
      if (!school || !country) {
        return res.status(400).json({ error: '학교와 국가를 모두 입력해주세요.' });
      }
      
      // Update user with additional info
      const updatedUser = await storage.updateUser(req.user!.id, {
        school,
        country
      });
      
      res.json({ 
        message: '회원가입이 완료되었습니다!', 
        user: { ...updatedUser, password: undefined }
      });
    } catch (error) {
      console.error('OAuth registration completion error:', error);
      res.status(500).json({ error: '회원가입 완료에 실패했습니다.' });
    }
  });

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

  // User Account Deletion
  app.delete('/api/user/account', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete all user's items first
      const userItems = await storage.getUserItems(userId);
      for (const item of userItems) {
        await storage.deleteItem(item.id);
      }
      
      // Delete user's favorites
      const userFavorites = await storage.getUserFavorites(userId);
      for (const favorite of userFavorites) {
        await storage.removeFavorite(userId, favorite.id);
      }
      
      // Delete the user account
      await storage.deleteUser(userId);
      
      // 로그아웃 처리: 세션 종료
      if (req.session) {
        req.session.destroy((err) => {
          if (err) console.error('Session destruction error:', err);
        });
      }
      
      // 클라이언트에게 강제 로그아웃 지시
      res.json({ 
        message: '계정이 성공적으로 삭제되었습니다.',
        forceLogout: true 
      });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: '계정 삭제에 실패했습니다.' });
    }
  });

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