import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
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
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
        } else if (message.type === 'chat_message') {
          // Handle chat message
          const newMessage = await storage.createMessage({
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType || 'text'
          });
          
          // Broadcast to room participants
          const room = await storage.getChatRoom(message.roomId);
          if (room) {
            [room.buyerId, room.sellerId].forEach(userId => {
              const client = clients.get(userId);
              if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'new_message',
                  message: newMessage
                }));
              }
            });
          }
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

  // Auth routes
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
        profileImage: validatedData.profileImage || null
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
          profileImage: user.profileImage
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
          profileImage: user.profileImage
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
          profileImage: user.profileImage
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
      res.json(rooms);
    } catch (error) {
      console.error('Get chat rooms error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/chat/rooms', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { itemId, sellerId } = req.body;
      
      const room = await storage.createChatRoom({
        itemId,
        buyerId: req.user!.id,
        sellerId
      });

      res.status(201).json(room);
    } catch (error) {
      console.error('Create chat room error:', error);
      res.status(400).json({ error: 'Failed to create chat room' });
    }
  });

  app.get('/api/chat/rooms/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Community routes
  app.get('/api/community/posts', async (req, res) => {
    try {
      const { school, country } = req.query;
      const posts = await storage.getCommunityPosts({
        school: school as string,
        country: country as string
      });

      res.json(posts);
    } catch (error) {
      console.error('Get community posts error:', error);
      res.status(500).json({ error: 'Server error' });
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
        ...validatedData,
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

  return httpServer;
}
