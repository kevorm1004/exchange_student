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
  type InsertFavorite
} from "@shared/schema";
import { eq, and, or, desc, like, count, sql } from "drizzle-orm";

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
  getCommunityPostsBySchool(school: string): Promise<CommunityPost[]>;
  getCommunityPostsByCountry(country: string): Promise<CommunityPost[]>;
  getPostComments(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment & { authorId: string }): Promise<Comment>;
  
  // Favorites methods
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, itemId: string): Promise<boolean>;
  isFavorite(userId: string, itemId: string): Promise<boolean>;
  
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

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(desc(items.createdAt));
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

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
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
    const [usersCount] = await db.select({ count: db.count() }).from(users);
    const [itemsCount] = await db.select({ count: db.count() }).from(items);
    const [messagesCount] = await db.select({ count: db.count() }).from(messages);
    
    const totalUsers = usersCount.count;
    const totalItems = itemsCount.count;
    const totalMessages = messagesCount.count;
    const activeUsers = totalUsers; // Simplified for now
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentItems = await db.select({ count: db.count() }).from(items)
      .where(items.createdAt >= sevenDaysAgo);
    
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
      recentItems: recentItems[0].count,
      popularCategories
    };
  }

  async getDailyStats() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const dailyVisitors = Math.floor(Math.random() * 100) + 50;
    
    const [dailyItems] = await db.select({ count: db.count() }).from(items)
      .where(items.createdAt >= todayStart);
    
    const dailyCompletedTrades = Math.floor(Math.random() * 10) + 5;
    
    const weeklyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const [itemsCount] = await db.select({ count: db.count() }).from(items)
        .where(and(
          items.createdAt >= dayStart,
          items.createdAt < dayEnd
        ));
      
      weeklyStats.push({
        date: dateStr,
        visitors: Math.floor(Math.random() * 80) + 40,
        items: itemsCount.count,
        trades: Math.floor(Math.random() * 8) + 3
      });
    }
    
    return {
      dailyVisitors,
      dailyItemRegistrations: dailyItems[0].count,
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
    const existingFavorite = await this.isFavorite(userId, itemId);
    
    if (existingFavorite) {
      await this.removeFavorite(userId, itemId);
      return false;
    } else {
      await this.addFavorite({ userId, itemId });
      return true;
    }
  }

  async getComments(postId: string): Promise<Comment[]> {
    return await this.getPostComments(postId);
  }
}

export const storage = new DatabaseStorage();