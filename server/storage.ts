import { 
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
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Item methods
  getItems(filter?: { school?: string; country?: string; category?: string; search?: string }): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem & { sellerId: string }): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  incrementItemViews(id: string): Promise<void>;
  toggleItemLike(itemId: string, userId: string): Promise<boolean>;

  // Chat methods
  getChatRooms(userId: string): Promise<ChatRoom[]>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getMessages(roomId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Community methods
  getCommunityPosts(filter?: { school?: string; country?: string }): Promise<CommunityPost[]>;
  getCommunityPost(id: string): Promise<CommunityPost | undefined>;
  createCommunityPost(post: InsertCommunityPost & { authorId: string }): Promise<CommunityPost>;
  getComments(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment & { authorId: string }): Promise<Comment>;

  // Favorites
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, itemId: string): Promise<boolean>;
  isFavorite(userId: string, itemId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private items: Map<string, Item> = new Map();
  private chatRooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, Message> = new Map();
  private communityPosts: Map<string, CommunityPost> = new Map();
  private comments: Map<string, Comment> = new Map();
  private favorites: Map<string, Favorite> = new Map();

  constructor() {
    // Initialize with some sample data
    this.initializeData();
  }

  private initializeData() {
    // This is just for demo - in production this would be empty
    const sampleUser: User = {
      id: "user1",
      username: "john_doe",
      email: "john@university.edu",
      password: "$2a$10$hashed_password", // In real app this would be properly hashed
      fullName: "John Doe",
      school: "Seoul National University",
      country: "South Korea",
      profileImage: null,
      createdAt: new Date(),
    };
    this.users.set(sampleUser.id, sampleUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getItems(filter?: { school?: string; country?: string; category?: string; search?: string }): Promise<Item[]> {
    let items = Array.from(this.items.values()).filter(item => item.isAvailable);
    
    if (filter?.school) {
      items = items.filter(item => item.school === filter.school);
    }
    if (filter?.country) {
      items = items.filter(item => item.country === filter.country);
    }
    if (filter?.category) {
      items = items.filter(item => item.category === filter.category);
    }
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(item: InsertItem & { sellerId: string }): Promise<Item> {
    const id = randomUUID();
    const newItem: Item = { 
      ...item, 
      id, 
      isAvailable: true,
      views: 0,
      likes: 0,
      createdAt: new Date() 
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async incrementItemViews(id: string): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.views += 1;
      this.items.set(id, item);
    }
  }

  async toggleItemLike(itemId: string, userId: string): Promise<boolean> {
    const favoriteKey = `${userId}-${itemId}`;
    const exists = this.favorites.has(favoriteKey);
    
    if (exists) {
      this.favorites.delete(favoriteKey);
      const item = this.items.get(itemId);
      if (item) {
        item.likes = Math.max(0, item.likes - 1);
        this.items.set(itemId, item);
      }
      return false;
    } else {
      const favorite: Favorite = {
        id: randomUUID(),
        userId,
        itemId,
        createdAt: new Date()
      };
      this.favorites.set(favoriteKey, favorite);
      const item = this.items.get(itemId);
      if (item) {
        item.likes += 1;
        this.items.set(itemId, item);
      }
      return true;
    }
  }

  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values())
      .filter(room => room.buyerId === userId || room.sellerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    return this.chatRooms.get(id);
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const id = randomUUID();
    const newRoom: ChatRoom = { 
      ...room, 
      id, 
      createdAt: new Date() 
    };
    this.chatRooms.set(id, newRoom);
    return newRoom;
  }

  async getMessages(roomId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const newMessage: Message = { 
      ...message, 
      id, 
      messageType: message.messageType || "text",
      createdAt: new Date() 
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getCommunityPosts(filter?: { school?: string; country?: string }): Promise<CommunityPost[]> {
    let posts = Array.from(this.communityPosts.values());
    
    if (filter?.school) {
      posts = posts.filter(post => post.school === filter.school);
    }
    if (filter?.country) {
      posts = posts.filter(post => post.country === filter.country);
    }
    
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCommunityPost(id: string): Promise<CommunityPost | undefined> {
    return this.communityPosts.get(id);
  }

  async createCommunityPost(post: InsertCommunityPost & { authorId: string }): Promise<CommunityPost> {
    const id = randomUUID();
    const newPost: CommunityPost = { 
      ...post, 
      id, 
      likes: 0,
      createdAt: new Date() 
    };
    this.communityPosts.set(id, newPost);
    return newPost;
  }

  async getComments(postId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createComment(comment: InsertComment & { authorId: string }): Promise<Comment> {
    const id = randomUUID();
    const newComment: Comment = { 
      ...comment, 
      id, 
      createdAt: new Date() 
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId);
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const id = randomUUID();
    const newFavorite: Favorite = { 
      ...favorite, 
      id, 
      createdAt: new Date() 
    };
    const key = `${favorite.userId}-${favorite.itemId}`;
    this.favorites.set(key, newFavorite);
    return newFavorite;
  }

  async removeFavorite(userId: string, itemId: string): Promise<boolean> {
    const key = `${userId}-${itemId}`;
    return this.favorites.delete(key);
  }

  async isFavorite(userId: string, itemId: string): Promise<boolean> {
    const key = `${userId}-${itemId}`;
    return this.favorites.has(key);
  }
}

export const storage = new MemStorage();
