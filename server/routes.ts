import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "./passport-config";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { 
  registerSchema,
  insertItemSchema,
  insertCommunityPostSchema,
  insertCommentSchema 
} from "@shared/schema";
import { z } from "zod";

// Custom login schema for server that doesn't require email format
const serverLoginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Trust proxy for HTTPS redirect URIs
  app.set('trust proxy', 1);

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
  }));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Seed database on startup (only in development)
  if (process.env.NODE_ENV === 'development') {
    try {
      await seedDatabase();
    } catch (error) {
      console.log("Database already seeded or seeding failed:", error);
    }
  }

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Authenticate WebSocket connection
          try {
            const decoded = jwt.verify(message.token, JWT_SECRET) as any;
            clients.set(decoded.id, ws);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          }
        } else if (message.type === 'join_room') {
          // Join a chat room
          const roomId = message.roomId;
          // Store room association for this client
          (ws as any).roomId = roomId;
        } else if (message.type === 'leave_room') {
          // Leave a chat room
          delete (ws as any).roomId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from active connections
      for (const [userId, client] of Array.from(clients.entries())) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
    });
  });

  // OAuth routes
  // Google OAuth
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
      // Generate JWT token for authenticated user
      const user = req.user as any;
      const token = jwt.sign({ 
        id: user.id,
        email: user.email 
      }, JWT_SECRET, { expiresIn: '24h' });
      
      // Redirect to frontend with token
      res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        school: user.school,
        country: user.country,
        preferredCurrency: user.preferredCurrency,
        role: user.role
      }))}`);
    }
  );

  // Kakao OAuth
  app.get('/api/auth/kakao', passport.authenticate('kakao'));
  app.get('/api/auth/kakao/callback', 
    passport.authenticate('kakao', { failureRedirect: '/auth/login' }),
    (req, res) => {
      const user = req.user as any;
      const token = jwt.sign({ 
        id: user.id,
        email: user.email 
      }, JWT_SECRET, { expiresIn: '24h' });
      
      res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        school: user.school,
        country: user.country,
        preferredCurrency: user.preferredCurrency,
        role: user.role
      }))}`);
    }
  );

  // Naver OAuth
  app.get('/api/auth/naver', passport.authenticate('naver'));
  app.get('/api/auth/naver/callback', 
    passport.authenticate('naver', { failureRedirect: '/auth/login' }),
    (req, res) => {
      const user = req.user as any;
      const token = jwt.sign({ 
        id: user.id,
        email: user.email 
      }, JWT_SECRET, { expiresIn: '24h' });
      
      res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        school: user.school,
        country: user.country,
        preferredCurrency: user.preferredCurrency,
        role: user.role
      }))}`);
    }
  );

  // Auth routes
  // Test login route for easy access
  app.post('/api/auth/test-login', async (req, res) => {
    try {
      const { username } = req.body;
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const token = jwt.sign({ 
        id: user.id,
        email: user.email 
      }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          school: user.school,
          country: user.country,
          preferredCurrency: user.preferredCurrency,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        fullName: validatedData.fullName,
        school: validatedData.school,
        country: validatedData.country,
        profileImage: validatedData.profileImage || null,
        preferredCurrency: validatedData.preferredCurrency || "USD",
        role: "user",
        status: "active"
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          fullName: user.fullName,
          school: user.school,
          country: user.country,
          profileImage: user.profileImage,
          preferredCurrency: user.preferredCurrency,
          role: user.role,
          status: user.status
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = serverLoginSchema.parse(req.body);
      
      // Find user by email first, then by username
      let user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        user = await storage.getUserByUsername(validatedData.email); // email field can also contain username
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          fullName: user.fullName,
          school: user.school,
          country: user.country,
          profileImage: user.profileImage,
          preferredCurrency: user.preferredCurrency,
          role: user.role,
          status: user.status
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          fullName: user.fullName,
          school: user.school,
          country: user.country,
          profileImage: user.profileImage,
          preferredCurrency: user.preferredCurrency,
          role: user.role,
          status: user.status
        } 
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update user profile
  app.put('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const targetUserId = req.params.id;
      
      // 사용자는 자신의 프로필만 업데이트할 수 있음
      if (userId !== targetUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { currentPassword, newPassword, ...updateData } = req.body;

      // 비밀번호 변경이 요청된 경우
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // 새 비밀번호 해시화
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedNewPassword;
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Items routes with pagination
  app.get('/api/items', async (req, res) => {
    try {
      const { school, country, category, search, page = '0', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      
      const allItems = await storage.getItems({
        school: school as string,
        country: country as string,
        category: category as string,
        search: search as string
      });

      // Simple pagination
      const startIndex = pageNum * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      res.json(paginatedItems);
    } catch (error) {
      console.error('Get items error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Search items endpoint - must be before /:id route
  app.get('/api/items/search', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim() === '') {
        return res.json([]);
      }

      const searchQuery = q.trim().toLowerCase();
      const allItems = await storage.getItems({});
      
      // Filter items based on search query
      const searchResults = allItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery) ||
        (item.category && item.category.toLowerCase().includes(searchQuery))
      );

      res.json(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/items/:id', async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Increment view count
      await storage.incrementItemViews(req.params.id);

      res.json(item);
    } catch (error) {
      console.error('Get item error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/items', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertItemSchema.parse(req.body);
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const item = await storage.createItem({
        ...validatedData,
        sellerId: user.id,
        school: user.school,
        country: user.country
      });

      res.status(201).json(item);
    } catch (error) {
      console.error('Create item error:', error);
      res.status(400).json({ error: 'Failed to create item' });
    }
  });

  app.post('/api/items/:id/toggle-like', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const isLiked = await storage.toggleItemLike(req.params.id, req.user!.id);
      res.json({ isLiked });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Chat routes
  app.get('/api/chat/rooms', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const rooms = await storage.getChatRooms(req.user!.id);
      
      // Get detailed room info with user and item data
      const detailedRooms = await Promise.all(
        rooms.map(async (room) => {
          const [item, buyer, seller] = await Promise.all([
            storage.getItem(room.itemId),
            storage.getUser(room.buyerId),
            storage.getUser(room.sellerId)
          ]);
          
          return {
            ...room,
            item,
            buyer,
            seller
          };
        })
      );
      
      res.json(detailedRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }
  });

  app.get('/api/chat/rooms/:roomId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getChatRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: 'Chat room not found' });
      }
      
      // Check if user is participant
      if (room.buyerId !== req.user!.id && room.sellerId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get detailed room info
      const [item, buyer, seller] = await Promise.all([
        storage.getItem(room.itemId),
        storage.getUser(room.buyerId),
        storage.getUser(room.sellerId)
      ]);
      
      res.json({
        ...room,
        item,
        buyer,
        seller
      });
    } catch (error) {
      console.error('Error fetching chat room:', error);
      res.status(500).json({ error: 'Failed to fetch chat room' });
    }
  });

  app.get('/api/chat/rooms/:roomId/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getChatRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: 'Chat room not found' });
      }
      
      // Check if user is participant
      if (room.buyerId !== req.user!.id && room.sellerId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const messages = await storage.getChatRoomMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chat/rooms/:roomId/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Chat room not found' });
      }
      
      // Check if user is participant
      if (room.buyerId !== req.user!.id && room.sellerId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const message = await storage.createMessage({
        roomId,
        senderId: req.user!.id,
        content: content.trim(),
        messageType: 'text'
      });
      
      // Broadcast to room participants via WebSocket
      [room.buyerId, room.sellerId].forEach(userId => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            message: message
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  app.post('/api/chat/rooms', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { itemId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }
      
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      // Cannot create chat room with yourself
      if (item.sellerId === req.user!.id) {
        return res.status(400).json({ error: 'Cannot chat with yourself' });
      }
      
      // Find or create chat room
      const room = await storage.findOrCreateChatRoom(itemId, req.user!.id, item.sellerId);
      
      // Check if this is a different item than the one the room was created for
      if (room.itemId !== itemId) {
        // Add system message about new item
        await storage.createMessage({
          roomId: room.id,
          senderId: 'system',
          content: `${item.title} 상품에 대한 채팅을 시작합니다.`
        });
      }
      
      // Get detailed room info
      const [roomItem, buyer, seller] = await Promise.all([
        storage.getItem(room.itemId),
        storage.getUser(room.buyerId),
        storage.getUser(room.sellerId)
      ]);
      
      res.json({
        ...room,
        item: roomItem,
        buyer,
        seller
      });
    } catch (error) {
      console.error('Error creating chat room:', error);
      res.status(500).json({ error: 'Failed to create chat room' });
    }
  });

  // Community routes
  app.get('/api/community/posts', async (req, res) => {
    try {
      const { school, country, filter } = req.query;
      let posts;
      
      if (filter === 'school' && school) {
        posts = await storage.getCommunityPostsBySchool(school as string);
      } else if (filter === 'country' && country) {
        posts = await storage.getCommunityPostsByCountry(country as string);
      } else {
        posts = await storage.getCommunityPosts();
      }
      
      res.json(posts);
    } catch (error) {
      console.error('Error fetching community posts:', error);
      res.status(500).json({ error: 'Failed to fetch community posts' });
    }
  });

  app.post('/api/community/posts', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCommunityPostSchema.parse(req.body);
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const post = await storage.createCommunityPost({
        title: validatedData.title,
        content: validatedData.content,
        authorId: user.id,
        school: user.school,
        country: user.country
      });

      res.status(201).json(post);
    } catch (error) {
      console.error('Create community post error:', error);
      res.status(400).json({ error: 'Failed to create post' });
    }
  });

  app.get('/api/community/posts/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/community/posts/:id/comments', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCommentSchema.parse(req.body);
      
      const comment = await storage.createComment({
        ...validatedData,
        postId: req.params.id,
        authorId: req.user!.id
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(400).json({ error: 'Failed to create comment' });
    }
  });

  // Favorites routes
  app.get('/api/favorites', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.user!.id);
      res.json(favorites);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin API endpoints
  app.get("/api/admin/stats", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/daily-stats", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const dailyStats = await storage.getDailyStats();
      res.json(dailyStats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/admin/export/users", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const users = await storage.getAdminUsers();
      
      // CSV 헤더
      const headers = ['ID', '사용자명', '이메일', '전체이름', '학교', '국가', '상태', '역할', '가입일'];
      
      // CSV 데이터
      const csvData = users.map(user => [
        user.id,
        user.username,
        user.email,
        user.fullName,
        user.school,
        user.country,
        user.status,
        user.role,
        user.createdAt.toISOString().split('T')[0]
      ]);
      
      // CSV 문자열 생성
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send('\uFEFF' + csvContent); // BOM for Excel compatibility
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ error: "Failed to export users" });
    }
  });

  app.get("/api/admin/export/items", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const items = await storage.getAdminItems();
      
      // CSV 헤더
      const headers = ['ID', '제목', '설명', '가격', '카테고리', '상태', '위치', '학교', '국가', '판매자ID', '조회수', '좋아요', '등록일'];
      
      // CSV 데이터
      const csvData = items.map(item => [
        item.id,
        item.title,
        item.description,
        item.price,
        item.category,
        item.condition,
        item.location,
        item.school,
        item.country,
        item.sellerId,
        item.views,
        item.likes,
        item.createdAt.toISOString().split('T')[0]
      ]);
      
      // CSV 문자열 생성
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
      res.send('\uFEFF' + csvContent); // BOM for Excel compatibility
    } catch (error) {
      console.error("Error exporting items:", error);
      res.status(500).json({ error: "Failed to export items" });
    }
  });

  app.get("/api/admin/items", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const search = req.query.search as string;
      const items = await storage.getAdminItems(search);
      res.json(items);
    } catch (error) {
      console.error("Error fetching admin items:", error);
      res.status(500).json({ error: "Failed to fetch admin items" });
    }
  });

  app.delete("/api/admin/items/:id", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const itemId = req.params.id;
      await storage.deleteItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.get("/api/admin/users", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const search = req.query.search as string;
      const users = await storage.getAdminUsers(search);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.patch("/api/admin/users/:id/status", authenticateToken, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const userId = req.params.id;
      const { status } = req.body;
      
      await storage.updateUserStatus(userId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Placeholder image endpoint for missing product images
  app.get('/api/placeholder-image.jpg', (req, res) => {
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f9fafb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)" stroke="#d1d5db" stroke-width="2"/>
      <circle cx="150" cy="100" r="25" fill="#9ca3af" opacity="0.5"/>
      <polygon points="100,180 200,180 180,140 120,140" fill="#9ca3af" opacity="0.5"/>
      <rect x="220" y="120" width="120" height="80" rx="8" fill="#9ca3af" opacity="0.3"/>
      <text x="50%" y="220" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">
        상품 이미지
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  });

  return httpServer;
}
