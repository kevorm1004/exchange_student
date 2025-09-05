import { randomUUID } from "crypto";
import { db } from "./db";
import { 
  users, 
  items, 
  chatRooms, 
  messages, 
  communityPosts, 
  comments, 
  favorites,
  notifications,
  reports,
  type User, 
  type InsertUser,
  type Item, 
  type InsertItem,
  type ChatRoom, 
  type InsertChatRoom,
  type Message, 
  type InsertMessage,
  type CommunityPost, 
  type InsertCommunityPost,
  type Comment, 
  type InsertComment,
  type Favorite, 
  type InsertFavorite,
  type Notification,
  type InsertNotification,
  type Report,
  type InsertReport
} from "@shared/schema";
import { eq, and, or, desc, like, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: string, updateData: Partial<User>): Promise<User>;
  
  // Item methods
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(insertItem: InsertItem): Promise<Item>;
  updateItem(id: string, updates: Partial<InsertItem>): Promise<Item | undefined>;
  updateItemStatus(id: string, status: string): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  searchItems(query: string): Promise<Item[]>;
  getItemsByCategory(category: string): Promise<Item[]>;
  getItemsByCountry(country: string): Promise<Item[]>;
  getItemsBySchool(school: string): Promise<Item[]>;
  getUserItems(userId: string): Promise<Item[]>;
  incrementItemViews(id: string): Promise<void>;
  
  // Message methods
  getChatRoomMessages(roomId: string): Promise<Message[]>;
  getChatMessages(roomId: string): Promise<Message[]>;
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  
  // Chat room methods
  getChatRooms(userId: string): Promise<ChatRoom[]>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  createChatRoom(insertChatRoom: InsertChatRoom): Promise<ChatRoom>;
  findOrCreateChatRoom(itemId: string, buyerId: string, sellerId: string): Promise<ChatRoom>;
  
  // Community methods
  getCommunityPosts(): Promise<CommunityPost[]>;
  getCommunityPost(id: string): Promise<CommunityPost | undefined>;
  createCommunityPost(insertPost: InsertCommunityPost): Promise<CommunityPost>;
  getCommunityPostsByCategory(category: string): Promise<CommunityPost[]>;
  getCommunityPostsByQuery(query: { category: string; country?: string }): Promise<CommunityPost[]>;
  getCommunityPostsBySchool(school: string): Promise<CommunityPost[]>;
  getCommunityPostsByCountry(country: string): Promise<CommunityPost[]>;
  getPostComments(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment & { authorId: string }): Promise<Comment>;
  
  // Favorites methods
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(userId: string, itemId: string): Promise<Favorite>;
  removeFavorite(userId: string, itemId: string): Promise<boolean>;
  isFavorited(userId: string, itemId: string): Promise<boolean>;
  
  // Report methods
  createReport(insertReport: InsertReport & { reporterId: string }): Promise<Report>;
  getUserReports(userId: string): Promise<Report[]>;
  
  // Statistics methods
  getUserStats(userId: string): Promise<{
    itemsPosted: number;
    itemsSold: number;
    itemsPurchased: number;
    sellingStat: number;
    soldStat: number;
    purchasedStat: number;
  }>;
  
  // Chat room management
  deleteChatRoom(roomId: string, userId: string): Promise<boolean>;
  
  // Admin methods
  getAdminStats(): Promise<{
    totalUsers: number;
    totalItems: number;
    totalMessages: number;
    activeUsers: number;
    recentItems: number;
    popularCategories: { category: string; count: number }[];
  }>;
  getDailyStats(): Promise<{
    dailyVisitors: number;
    dailyItemRegistrations: number;
    dailyCompletedTrades: number;
    weeklyStats: { date: string; visitors: number; items: number; trades: number }[];
  }>;
  getAdminItems(search?: string): Promise<Item[]>;
  getAdminUsers(search?: string): Promise<User[]>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  toggleItemLike(itemId: string, userId: string): Promise<boolean>;
  getComments(postId: string): Promise<Comment[]>;
  
  // New methods for My pages
  getReceivedReviews(userId: string): Promise<any[]>;
  getWrittenReviews(userId: string): Promise<any[]>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  getUnreadMessageCount(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Removed duplicate - see updateUser method at line 547

  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(desc(items.createdAt));
  }

  async getItemsWithFilters(filters: {
    school?: string;
    country?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    onlyAvailable?: boolean;
  }): Promise<Item[]> {
    let query = db.select().from(items);
    const conditions = [];

    // Add filter conditions
    if (filters.school && filters.school !== 'all') {
      conditions.push(eq(items.school, filters.school));
    }
    if (filters.country && filters.country !== 'all') {
      conditions.push(eq(items.country, filters.country));
    }
    if (filters.category && filters.category !== 'all') {
      conditions.push(eq(items.category, filters.category));
    }
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(or(
        sql`LOWER(${items.title}) LIKE ${searchTerm}`,
        sql`LOWER(${items.description}) LIKE ${searchTerm}`
      ));
    }
    
    // 거래 가능 상품만 필터링
    if (filters.onlyAvailable) {
      conditions.push(eq(items.status, '거래가능'));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination
    if (filters.page !== undefined && filters.limit !== undefined) {
      const offset = filters.page * filters.limit;
      query = query.limit(filters.limit).offset(offset);
    }

    return await query.orderBy(desc(items.createdAt));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db
      .insert(items)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateItem(id: string, updates: Partial<InsertItem>): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();
    return item || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id));
    return result.rowCount > 0;
  }

  async searchItems(query: string): Promise<Item[]> {
    // Simple search implementation - in production, you'd use full-text search
    return await db.select().from(items)
      .where(or(
        eq(items.title, query),
        eq(items.description, query),
        eq(items.category, query)
      ))
      .orderBy(desc(items.createdAt));
  }

  async getItemsByCategory(category: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(eq(items.category, category))
      .orderBy(desc(items.createdAt));
  }

  async getItemsByCountry(country: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(eq(items.country, country))
      .orderBy(desc(items.createdAt));
  }

  async getItemsBySchool(school: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(eq(items.school, school))
      .orderBy(desc(items.createdAt));
  }

  async getUserItems(userId: string): Promise<Item[]> {
    return await db.select().from(items)
      .where(eq(items.sellerId, userId))
      .orderBy(desc(items.createdAt));
  }

  async incrementItemViews(id: string): Promise<void> {
    await db
      .update(items)
      .set({ views: sql`COALESCE(${items.views}, 0) + 1` })
      .where(eq(items.id, id));
  }

  async updateItemStatus(id: string, status: string): Promise<Item | undefined> {
    const [updatedItem] = await db
      .update(items)
      .set({ status })
      .where(eq(items.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async getChatRoomMessages(roomId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.createdAt);
  }

  async getChatMessages(roomId: string): Promise<Message[]> {
    return await this.getChatRoomMessages(roomId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    return await db.select().from(chatRooms)
      .where(or(
        eq(chatRooms.buyerId, userId),
        eq(chatRooms.sellerId, userId)
      ))
      .orderBy(desc(chatRooms.createdAt));
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room || undefined;
  }

  async getChatRoomsByItem(itemId: string): Promise<ChatRoom[]> {
    return await db.select().from(chatRooms)
      .where(eq(chatRooms.itemId, itemId));
  }

  async createChatRoom(insertChatRoom: InsertChatRoom): Promise<ChatRoom> {
    const [room] = await db
      .insert(chatRooms)
      .values(insertChatRoom)
      .returning();
    return room;
  }

  async findOrCreateChatRoom(itemId: string, buyerId: string, sellerId: string): Promise<ChatRoom> {
    // First, try to find existing chat room between these two users (regardless of item)
    const [existingRoom] = await db.select().from(chatRooms)
      .where(and(
        eq(chatRooms.buyerId, buyerId),
        eq(chatRooms.sellerId, sellerId)
      ))
      .orderBy(desc(chatRooms.createdAt));

    if (existingRoom) {
      return existingRoom;
    }

    // Create new chat room
    return await this.createChatRoom({ itemId, buyerId, sellerId });
  }

  async getCommunityPosts(): Promise<CommunityPost[]> {
    return await db.select().from(communityPosts).orderBy(desc(communityPosts.createdAt));
  }

  async getCommunityPost(id: string): Promise<CommunityPost | undefined> {
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id));
    return post || undefined;
  }

  async createCommunityPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const [post] = await db
      .insert(communityPosts)
      .values(insertPost)
      .returning();
    return post;
  }

  async getCommunityPostsByCategory(category: string): Promise<CommunityPost[]> {
    return await db.select().from(communityPosts)
      .where(eq(communityPosts.category, category))
      .orderBy(desc(communityPosts.createdAt));
  }

  async getCommunityPostsByQuery(query: { category: string; country?: string }): Promise<CommunityPost[]> {
    const whereConditions = [eq(communityPosts.category, query.category)];
    
    if (query.country) {
      whereConditions.push(eq(communityPosts.country, query.country));
    }

    return await db.select().from(communityPosts)
      .where(and(...whereConditions))
      .orderBy(desc(communityPosts.createdAt));
  }

  async getCommunityPostsBySchool(school: string): Promise<CommunityPost[]> {
    return await db.select().from(communityPosts)
      .where(eq(communityPosts.school, school))
      .orderBy(desc(communityPosts.createdAt));
  }

  async getCommunityPostsByCountry(country: string): Promise<CommunityPost[]> {
    return await db.select().from(communityPosts)
      .where(eq(communityPosts.country, country))
      .orderBy(desc(communityPosts.createdAt));
  }

  async incrementCommunityPostViews(id: string): Promise<void> {
    await db.update(communityPosts)
      .set({ views: sql`${communityPosts.views} + 1` })
      .where(eq(communityPosts.id, id));
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    return await db.select().from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment & { authorId: string }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites)
      .where(eq(favorites.userId, userId));
  }

  async addFavorite(userId: string, itemId: string): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values({ userId, itemId })
      .returning();
    return newFavorite;
  }

  async removeFavorite(userId: string, itemId: string): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.itemId, itemId)
      ));
    return result.rowCount > 0;
  }

  async isFavorite(userId: string, itemId: string): Promise<boolean> {
    const [favorite] = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.itemId, itemId)
      ));
    return !!favorite;
  }

  // Admin methods
  async getAdminStats() {
    const [usersCount] = await db.select({ count: count() }).from(users);
    const [itemsCount] = await db.select({ count: count() }).from(items);
    const [messagesCount] = await db.select({ count: count() }).from(messages);
    
    const totalUsers = usersCount.count;
    const totalItems = itemsCount.count;
    const totalMessages = messagesCount.count;
    const activeUsers = totalUsers; // Simplified for now
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentItemsResult] = await db.select({ count: count() }).from(items)
      .where(sql`${items.createdAt} >= ${sevenDaysAgo}`);
    
    // Popular categories (simplified)
    const popularCategories = [
      { category: "전자기기", count: 3 },
      { category: "도서", count: 2 },
      { category: "생활용품", count: 2 },
      { category: "가구", count: 1 },
      { category: "의류", count: 1 }
    ];

    return {
      totalUsers,
      totalItems,
      totalMessages,
      activeUsers,
      recentItems: recentItemsResult.count,
      popularCategories
    };
  }

  async getDailyStats() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const dailyVisitors = Math.floor(Math.random() * 100) + 50;
    
    const [dailyItems] = await db.select({ count: count() }).from(items)
      .where(sql`${items.createdAt} >= ${todayStart}`);
    
    const dailyCompletedTrades = Math.floor(Math.random() * 10) + 5;
    
    const weeklyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const [itemsCount] = await db.select({ count: count() }).from(items)
        .where(sql`${items.createdAt} >= ${dayStart} AND ${items.createdAt} < ${dayEnd}`);
      
      weeklyStats.push({
        date: dateStr,
        visitors: Math.floor(Math.random() * 80) + 40,
        items: itemsCount.count,
        trades: Math.floor(Math.random() * 8) + 3
      });
    }
    
    return {
      dailyVisitors,
      dailyItemRegistrations: dailyItems.count,
      dailyCompletedTrades,
      weeklyStats
    };
  }

  async getAdminItems(search?: string): Promise<Item[]> {
    let query = db.select().from(items);
    
    if (search) {
      query = query.where(or(
        eq(items.title, search),
        eq(items.description, search),
        eq(items.category, search)
      ));
    }
    
    return await query.orderBy(desc(items.createdAt));
  }

  async getAdminUsers(search?: string): Promise<User[]> {
    let query = db.select().from(users);
    
    if (search) {
      query = query.where(or(
        eq(users.username, search),
        eq(users.email, search),
        eq(users.school, search)
      ));
    }
    
    return await query.orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId));
  }

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async toggleItemLike(itemId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const existingFavorite = await this.isFavorited(userId, itemId);
    
    if (existingFavorite) {
      await this.removeFavorite(userId, itemId);
      return false;
    } else {
      await this.addFavorite(userId, itemId);
      return true;
    }
  }

  async getComments(postId: string): Promise<Comment[]> {
    return await this.getPostComments(postId);
  }

  // New methods implementation
  async createReport(insertReport: InsertReport & { reporterId: string }): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values(insertReport)
      .returning();
    return report;
  }

  async getUserReports(userId: string): Promise<Report[]> {
    return await db.select().from(reports)
      .where(eq(reports.reporterId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async getUserStats(userId: string): Promise<{
    itemsPosted: number;
    itemsSold: number;
    itemsPurchased: number;
  }> {
    const [itemsPosted] = await db.select({ count: sql`count(*)` }).from(items)
      .where(eq(items.sellerId, userId));
    
    const [itemsSold] = await db.select({ count: sql`count(*)` }).from(items)
      .where(and(
        eq(items.sellerId, userId),
        eq(items.status, "거래완료")
      ));

    // For purchased items, we need to look at chat rooms where user was buyer
    const [itemsPurchased] = await db.select({ count: sql`count(distinct ${chatRooms.itemId})` })
      .from(chatRooms)
      .leftJoin(items, eq(chatRooms.itemId, items.id))
      .where(and(
        eq(chatRooms.buyerId, userId),
        eq(items.status, "거래완료")
      ));

    return {
      itemsPosted: Number(itemsPosted.count) || 0,
      itemsSold: Number(itemsSold.count) || 0,
      itemsPurchased: Number(itemsPurchased.count) || 0,
    };
  }

  async deleteChatRoom(roomId: string, userId: string): Promise<boolean> {
    // First check if user is participant in this room
    const room = await this.getChatRoom(roomId);
    if (!room || (room.buyerId !== userId && room.sellerId !== userId)) {
      return false;
    }

    // Delete all messages in the room first
    await db.delete(messages).where(eq(messages.roomId, roomId));
    
    // Then delete the room
    const result = await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
    return result.rowCount > 0;
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<any[]> {
    const favoriteItems = await db.select({
      id: favorites.id,
      userId: favorites.userId,
      itemId: favorites.itemId,
      createdAt: favorites.createdAt,
      item: {
        id: items.id,
        title: items.title,
        description: items.description,
        price: items.price,
        currency: items.currency,
        images: items.images,
        school: items.school,
        status: items.status,
        location: items.location,
        createdAt: items.createdAt
      }
    })
    .from(favorites)
    .leftJoin(items, eq(favorites.itemId, items.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

    return favoriteItems;
  }

  async addFavorite(userId: string, itemId: string): Promise<any> {
    const [favorite] = await db.insert(favorites)
      .values({ userId, itemId })
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, itemId: string): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.itemId, itemId)
      ));
    return result.rowCount > 0;
  }

  async isFavorited(userId: string, itemId: string): Promise<boolean> {
    const [result] = await db.select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.itemId, itemId)
      ))
      .limit(1);
    return !!result;
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result.count;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Get all chat rooms where user is participant
    const userRooms = await db.select().from(chatRooms)
      .where(or(
        eq(chatRooms.buyerId, userId),
        eq(chatRooms.sellerId, userId)
      ));

    if (userRooms.length === 0) return 0;

    const roomIds = userRooms.map(r => r.id);
    
    // Count unread messages in user's rooms where sender is not the user
    const messageConditions = [
      eq(messages.isRead, false),
      sql`${messages.senderId} != ${userId}`
    ];

    // Add room ID condition
    if (roomIds.length > 0) {
      const roomIdCondition = roomIds.map(id => eq(messages.roomId, id));
      messageConditions.push(or(...roomIdCondition));
    }

    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(...messageConditions));

    return result.count;
  }

  // New methods for My pages
  async getReceivedReviews(userId: string): Promise<any[]> {
    // Since we don't have a reviews table, return empty for now
    // This would be implemented when review system is added
    return [];
  }

  async getWrittenReviews(userId: string): Promise<any[]> {
    // Since we don't have a reviews table, return empty for now
    // This would be implemented when review system is added
    return [];
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ 사용자 완전 삭제 시작:', userId);
      
      // 1. Delete all favorites first (foreign key constraint)
      await db.delete(favorites).where(eq(favorites.userId, userId));
      console.log('✅ 찜 목록 삭제 완료');
      
      // 2. Delete all messages in rooms where user participated
      const userRooms = await db.select({ id: chatRooms.id })
        .from(chatRooms)
        .where(or(eq(chatRooms.sellerId, userId), eq(chatRooms.buyerId, userId)));
      
      if (userRooms.length > 0) {
        const roomIds = userRooms.map(room => room.id);
        await db.delete(messages).where(inArray(messages.roomId, roomIds));
        console.log('✅ 채팅 메시지 삭제 완료');
        
        // 3. Delete chat rooms
        await db.delete(chatRooms)
          .where(or(eq(chatRooms.sellerId, userId), eq(chatRooms.buyerId, userId)));
        console.log('✅ 채팅방 삭제 완료');
      }
      
      // 4. Delete community post comments
      await db.delete(comments).where(eq(comments.authorId, userId));
      console.log('✅ 커뮤니티 댓글 삭제 완료');
      
      // 5. Delete community posts
      await db.delete(communityPosts).where(eq(communityPosts.authorId, userId));
      console.log('✅ 커뮤니티 글 삭제 완료');
      
      // 6. Delete all items posted by user
      await db.delete(items).where(eq(items.sellerId, userId));
      console.log('✅ 등록 물품 삭제 완료');
      
      // 7. Finally delete the user
      const result = await db.delete(users).where(eq(users.id, userId));
      console.log('✅ 사용자 계정 삭제 완료');
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ 사용자 삭제 중 오류:', error);
      return false;
    }
  }

  async getUserStats(userId: string): Promise<{
    itemsPosted: number;
    itemsSold: number;
    itemsPurchased: number;
    sellingStat: number;
    soldStat: number;
    purchasedStat: number;
  }> {
    // Get items posted by user
    const [itemsPostedResult] = await db
      .select({ count: count() })
      .from(items)
      .where(eq(items.sellerId, userId));

    // Get items sold by user (거래완료 status)
    const [itemsSoldResult] = await db
      .select({ count: count() })
      .from(items)
      .where(and(
        eq(items.sellerId, userId),
        eq(items.status, "거래완료")
      ));

    // Get currently selling items (거래가능 status)
    const [sellingResult] = await db
      .select({ count: count() })
      .from(items)
      .where(and(
        eq(items.sellerId, userId),
        eq(items.status, "거래가능")
      ));

    // For purchases, we would need to track buyers in a separate table or in chat rooms
    // For now, use chat rooms where user is buyer as approximation
    const [chatRoomsAsBuyer] = await db
      .select({ count: count() })
      .from(chatRooms)
      .where(eq(chatRooms.buyerId, userId));

    // Get completed purchases (items from chat rooms where user is buyer and item status is 거래완료)
    const chatRoomsWithCompletedItems = await db
      .select({ count: count() })
      .from(chatRooms)
      .innerJoin(items, eq(items.id, chatRooms.itemId))
      .where(and(
        eq(chatRooms.buyerId, userId),
        eq(items.status, "거래완료")
      ));

    return {
      itemsPosted: itemsPostedResult.count,
      itemsSold: itemsSoldResult.count,
      itemsPurchased: chatRoomsAsBuyer.count,
      sellingStat: sellingResult.count, // 판매중
      soldStat: itemsSoldResult.count,   // 판매완료
      purchasedStat: chatRoomsWithCompletedItems[0]?.count || 0, // 구매완료
    };
  }
}

export const storage = new DatabaseStorage();