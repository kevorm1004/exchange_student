import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "./passport-config";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import './exchange'; // Initialize exchange service
import { 
  registerSchema,
  insertItemSchema,
  insertCommunityPostSchema,
  insertCommentSchema,
  type User
} from "@shared/schema";
import { z } from "zod";

// Custom login schema for server that doesn't require email format
const serverLoginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("Auth header:", authHeader);
  console.log("Extracted token:", token ? token.substring(0, 20) + "..." : "none");

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("Decoded token:", decoded);
    const user = await storage.getUser(decoded.id);
    if (!user) {
      console.log("User not found for ID:", decoded.id);
      return res.status(403).json({ error: 'User not found' });
    }
    console.log("Authentication successful for user:", user.username);
    req.user = user;
    next();
  } catch (error) {
    console.log("Token verification failed:", error);
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
  // Google OAuth - Direct URL approach for debugging
  app.get('/api/auth/google', (req, res) => {
    console.log('Google OAuth initiated - direct approach');
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent('https://1b996db4-2b46-4043-bd81-c1a3847beff0-00-2akh5nzv1zwuu.spock.replit.dev/api/auth/google/callback')}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('profile email')}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    console.log('Redirecting to:', googleAuthUrl);
    res.redirect(googleAuthUrl);
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    console.log('Google callback received:', req.query);
    console.log('Full callback URL:', req.url);
    
    const { code, error, state } = req.query;
    
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect('/auth/login?error=' + error);
    }
    
    if (!code) {
      console.error('No authorization code received - user may have cancelled or denied access');
      console.log('Query params received:', Object.keys(req.query));
      return res.redirect('/auth/login?error=access_denied');
    }
    
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: 'https://1b996db4-2b46-4043-bd81-c1a3847beff0-00-2akh5nzv1zwuu.spock.replit.dev/api/auth/google/callback'
        })
      });
      
      const tokens = await tokenResponse.json();
      console.log('Token response:', tokens);
      
      if (!tokens.access_token) {
        console.error('No access token received:', tokens);
        return res.redirect('/auth/login?error=no_token');
      }
      
      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      const googleUser = await userResponse.json();
      console.log('Google user info:', googleUser);
      
      if (!googleUser.email) {
        console.error('No email from Google user info');
        return res.redirect('/auth/login?error=no_email');
      }
      
      // Check if user exists or create new one
      let user = await storage.getUserByEmail(googleUser.email);
      
      if (!user) {
        // Create new user
        const username = `google_${googleUser.id}`;
        user = await storage.createUser({
          username,
          email: googleUser.email,
          password: '', // OAuth users don't need password
          fullName: googleUser.name || username,
          school: '',
          country: '',
          profileImage: googleUser.picture || null,
          authProvider: 'google',
          googleId: googleUser.id
        });
      } else if (!user.googleId) {
        // Link existing account with Google
        await storage.updateUser(user.id, {
          googleId: googleUser.id,
          authProvider: user.authProvider === 'email' ? 'email,google' : user.authProvider + ',google'
        });
      }
      
      console.log('Google OAuth successful for user:', user.email);
      
      // Generate JWT token
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
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth/login?error=callback_error');
    }
  });

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
      // Find or create a test user
      let user = await storage.getUserByEmail("test@example.com");
      
      if (!user) {
        user = await storage.createUser({
          email: "test@example.com",
          username: "testuser",
          password: await bcrypt.hash("password", 10),
          fullName: "Test User",
          country: "일본",
          school: "도쿄대학교"
        });
      }

      const token = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log("Test login successful - User ID:", user.id);
      console.log("Generated token:", token.substring(0, 20) + "...");

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ error: 'Test login failed' });
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

  // Items routes with pagination and filtering
  app.get('/api/items', async (req, res) => {
    try {
      const { school, country, category, search, page = '0', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      
      // Use optimized filtering at database level
      const items = await storage.getItemsWithFilters({
        school: school as string,
        country: country as string,
        category: category as string,
        search: search as string,
        page: pageNum,
        limit: limitNum
      });

      res.json(items);
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
      const allItems = await storage.getItems();
      
      // Filter items based on search query
      const searchResults = allItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
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

  // Update item status
  app.put('/api/items/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const itemId = req.params.id;
      const userId = req.user!.id;
      const { status } = req.body;

      // Check if item exists and user is the seller
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (item.sellerId !== userId) {
        return res.status(403).json({ error: 'Only the seller can update item status' });
      }

      // Validate status
      const validStatuses = ['거래가능', '거래완료', '거래기간만료'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Update item status
      const updatedItem = await storage.updateItemStatus(itemId, status);
      
      // Create notification for interested buyers (from chat rooms)
      if (status === '거래완료' || status === '거래기간만료') {
        const chatRooms = await storage.getChatRoomsByItem(itemId);
        const seller = await storage.getUser(userId);
        
        for (const room of chatRooms) {
          if (room.buyerId !== userId) { // Don't notify seller
            await storage.createNotification({
              userId: room.buyerId,
              type: 'status_change',
              content: `관심 상품 "${item.title}"의 거래 상태가 "${status}"로 변경되었습니다.`,
              link: `/items/${itemId}`
            });
          }
        }
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).json({ error: 'Failed to update item status' });
    }
  });

  app.post('/api/items', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Parse dates from strings if they exist
      const itemData = { ...req.body };
      if (itemData.availableFrom && typeof itemData.availableFrom === 'string') {
        itemData.availableFrom = new Date(itemData.availableFrom);
      }
      if (itemData.availableTo && typeof itemData.availableTo === 'string') {
        itemData.availableTo = new Date(itemData.availableTo);
      }
      
      const validatedData = insertItemSchema.parse(itemData);
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const itemCreateData = {
        title: validatedData.title,
        description: validatedData.description,
        price: validatedData.price,
        condition: validatedData.condition,
        images: validatedData.images || [],
        sellerId: user.id,
        school: user.school || "",
        country: user.country || "",
        currency: validatedData.currency,
        location: validatedData.location,
        deliveryMethod: validatedData.deliveryMethod,
        customDeliveryMethod: validatedData.customDeliveryMethod,
        availableFrom: validatedData.availableFrom,
        availableTo: validatedData.availableTo
      };
      
      const item = await storage.createItem(itemCreateData);

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

  // Report item
  app.post('/api/items/:id/report', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason, description } = req.body;
      const itemId = req.params.id;
      const reporterId = req.user!.id;

      if (!reason) {
        return res.status(400).json({ error: '신고 사유를 선택해주세요' });
      }

      const report = await storage.createReport({
        itemId,
        reason,
        description: description || '',
        reporterId
      });

      res.status(201).json({ message: '신고가 접수되었습니다', report });
    } catch (error) {
      console.error('Report error:', error);
      res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다' });
    }
  });

  // Get user statistics
  app.get('/api/users/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error('User stats error:', error);
      res.status(500).json({ error: 'Failed to get user statistics' });
    }
  });

  // Get user items by status
  app.get('/api/users/items', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.query;
      let items = await storage.getUserItems(req.user!.id);
      
      if (status && status !== 'all') {
        items = items.filter(item => item.status === status);
      }
      
      res.json(items);
    } catch (error) {
      console.error('User items error:', error);
      res.status(500).json({ error: 'Failed to get user items' });
    }
  });

  // Get user favorites
  app.get('/api/users/favorites', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.user!.id);
      
      // Get item details for each favorite
      const favoriteItems = await Promise.all(
        favorites.map(async (favorite) => {
          const item = await storage.getItem(favorite.itemId);
          return { ...favorite, item };
        })
      );
      
      res.json(favoriteItems);
    } catch (error) {
      console.error('User favorites error:', error);
      res.status(500).json({ error: 'Failed to get user favorites' });
    }
  });

  // Chat routes
  app.get('/api/chat/rooms', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log(`Fetching chat rooms for user: ${userId}`);
      
      const rooms = await storage.getChatRooms(userId);
      console.log(`Found ${rooms.length} rooms for user ${userId}`);
      
      // Double check: ensure user is participant in each room
      const validRooms = rooms.filter(room => 
        room.buyerId === userId || room.sellerId === userId
      );
      
      if (validRooms.length !== rooms.length) {
        console.warn(`Filtered out ${rooms.length - validRooms.length} invalid rooms for user ${userId}`);
      }
      
      // Get detailed room info with user and item data
      const detailedRooms = await Promise.all(
        validRooms.map(async (room) => {
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
      const userId = req.user!.id;
      
      const room = await storage.getChatRoom(roomId);
      
      if (!room) {
        console.warn(`Room not found: ${roomId} requested by user: ${userId}`);
        return res.status(404).json({ error: 'Chat room not found' });
      }
      
      // Check if user is participant
      if (room.buyerId !== userId && room.sellerId !== userId) {
        console.warn(`Access denied: User ${userId} tried to access room ${roomId} (buyer: ${room.buyerId}, seller: ${room.sellerId})`);
        return res.status(403).json({ error: 'Access denied - You are not a participant in this chat room' });
      }
      
      const messages = await storage.getChatRoomMessages(roomId);
      console.log(`Returning ${messages.length} messages for room ${roomId} to user ${userId}`);
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
      const userId = req.user!.id;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        console.warn(`Room not found: ${roomId} for message from user: ${userId}`);
        return res.status(404).json({ error: 'Chat room not found' });
      }
      
      // Check if user is participant
      if (room.buyerId !== userId && room.sellerId !== userId) {
        console.warn(`Access denied: User ${userId} tried to send message to room ${roomId} (buyer: ${room.buyerId}, seller: ${room.sellerId})`);
        return res.status(403).json({ error: 'Access denied - You are not a participant in this chat room' });
      }
      
      const message = await storage.createMessage({
        roomId,
        senderId: userId,
        content: content.trim(),
        messageType: 'text'
      });
      
      console.log(`Message created by user ${userId} in room ${roomId}`);
      
      // Create notification for the recipient
      const recipientId = room.buyerId === userId ? room.sellerId : room.buyerId;
      const sender = await storage.getUser(userId);
      
      await storage.createNotification({
        userId: recipientId,
        type: 'new_message',
        content: `${sender?.username || '사용자'}님이 메시지를 보냈습니다: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
        link: `/chat/${roomId}`
      });
      
      // Broadcast to room participants via WebSocket
      [room.buyerId, room.sellerId].forEach(participantId => {
        const client = clients.get(participantId);
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

  // Delete chat room
  app.delete('/api/chat/rooms/:roomId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.user!.id;
      
      const success = await storage.deleteChatRoom(roomId, userId);
      
      if (!success) {
        return res.status(403).json({ error: 'Cannot delete this chat room' });
      }
      
      res.json({ message: 'Chat room deleted successfully' });
    } catch (error) {
      console.error('Error deleting chat room:', error);
      res.status(500).json({ error: 'Failed to delete chat room' });
    }
  });

  // Community routes
  app.get('/api/community/posts', async (req, res) => {
    try {
      const { category, country } = req.query;
      let posts;
      
      if (category && country && country !== "전체") {
        posts = await storage.getCommunityPostsByQuery({
          category: category as string,
          country: country as string
        });
      } else if (category) {
        posts = await storage.getCommunityPostsByCategory(category as string);
      } else {
        posts = await storage.getCommunityPosts();
      }
      
      res.json(posts);
    } catch (error) {
      console.error('Error fetching community posts:', error);
      res.status(500).json({ error: 'Failed to fetch community posts' });
    }
  });

  // Get single community post by ID
  app.get('/api/community/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getCommunityPost(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Increment view count
      await storage.incrementCommunityPostViews(id);
      
      res.json(post);
    } catch (error) {
      console.error('Error fetching community post:', error);
      res.status(500).json({ error: 'Failed to fetch community post' });
    }
  });

  app.post('/api/community/posts', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Community post request body:", req.body);
      console.log("Authenticated user:", req.user);
      
      const validatedData = insertCommunityPostSchema.parse(req.body);
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        console.log("User not found in database:", req.user!.id);
        return res.status(404).json({ error: 'User not found' });
      }

      const postData = {
        title: validatedData.title,
        content: validatedData.content,
        category: validatedData.category,
        authorId: user.id,
        school: validatedData.school || user.school || "",
        country: validatedData.country || user.country || "",
        images: validatedData.images || [],
        ...(validatedData.semester && { semester: validatedData.semester }),
        ...(validatedData.openChatLink && { openChatLink: validatedData.openChatLink })
      };
      
      console.log("Creating community post with data:", postData);
      const post = await storage.createCommunityPost(postData);
      console.log("Post created successfully:", post);

      res.status(201).json(post);
    } catch (error) {
      console.error('Create community post error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: 'Failed to create post' });
      }
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

  // Exchange rate endpoints
  app.get('/api/exchange', async (req, res) => {
    try {
      const { exchangeService } = await import('./exchange');
      const rates = exchangeService.getRates();
      const lastUpdate = exchangeService.getLastUpdate();
      
      res.json({
        rates,
        lastUpdate: lastUpdate?.toISOString() || null,
        baseCurrency: 'KRW'
      });
    } catch (error) {
      console.error('Get exchange rates error:', error);
      res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
  });

  app.post('/api/exchange/refresh', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { exchangeService } = await import('./exchange');
      const success = await exchangeService.updateRates();
      
      if (success) {
        const rates = exchangeService.getRates();
        const lastUpdate = exchangeService.getLastUpdate();
        
        res.json({
          message: 'Exchange rates updated successfully',
          rates,
          lastUpdate: lastUpdate?.toISOString() || null,
          baseCurrency: 'KRW'
        });
      } else {
        res.status(500).json({ error: 'Failed to update exchange rates' });
      }
    } catch (error) {
      console.error('Refresh exchange rates error:', error);
      res.status(500).json({ error: 'Failed to refresh exchange rates' });
    }
  });

  // Favorites endpoints
  app.get('/api/favorites', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.user!.id);
      res.json(favorites);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.post('/api/favorites', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { itemId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      // Check if item exists
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const favorite = await storage.addFavorite(req.user!.id, itemId);
      res.status(201).json(favorite);
    } catch (error) {
      console.error('Add favorite error:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(409).json({ error: 'Item already in favorites' });
      } else {
        res.status(500).json({ error: 'Failed to add favorite' });
      }
    }
  });

  app.delete('/api/favorites/:itemId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { itemId } = req.params;
      const success = await storage.removeFavorite(req.user!.id, itemId);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Favorite not found' });
      }
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  });

  app.get('/api/favorites/check/:itemId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { itemId } = req.params;
      const isFavorited = await storage.isFavorited(req.user!.id, itemId);
      res.json({ isFavorited });
    } catch (error) {
      console.error('Check favorite error:', error);
      res.status(500).json({ error: 'Failed to check favorite status' });
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

      // Create notification for post author (if not commenting on own post)
      const post = await storage.getCommunityPost(req.params.id);
      if (post && post.authorId !== req.user!.id) {
        const commenter = await storage.getUser(req.user!.id);
        await storage.createNotification({
          userId: post.authorId,
          type: 'new_comment',
          content: `${commenter?.username || '사용자'}님이 회원님의 게시글에 댓글을 남겼습니다: ${validatedData.content.slice(0, 50)}${validatedData.content.length > 50 ? '...' : ''}`,
          link: `/community/post/${req.params.id}`
        });
      }

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

  // Notification routes
  app.get("/api/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationAsRead(id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  app.get("/api/messages/unread-count", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // My Items routes
  app.get("/api/items/my", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const items = await storage.getUserItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching user items:", error);
      res.status(500).json({ error: "Failed to fetch user items" });
    }
  });

  // Reviews routes
  app.get("/api/reviews/received", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const reviews = await storage.getReceivedReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching received reviews:", error);
      res.status(500).json({ error: "Failed to fetch received reviews" });
    }
  });

  app.get("/api/reviews/written", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const reviews = await storage.getWrittenReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching written reviews:", error);
      res.status(500).json({ error: "Failed to fetch written reviews" });
    }
  });

  // User profile and settings routes
  app.put("/api/user/profile", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const profileData = req.body;
      
      const updatedUser = await storage.updateUser(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.put("/api/user/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notificationSettings = req.body;
      
      // Store notification preferences (this would require adding to schema)
      res.json({ success: true, message: "Notification settings updated" });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  app.delete("/api/user/account", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete user account and all related data
      await storage.deleteUser(userId);
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // User statistics route
  app.get("/api/users/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  return httpServer;
}
