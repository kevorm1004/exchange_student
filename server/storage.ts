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

    // Add a test user for product registration
    const testUser: User = {
      id: "test_user",
      username: "test123",
      email: "test@student.com",
      password: "$2a$10$YourHashedPasswordHere", // password: "test123"
      fullName: "테스트 사용자",
      school: "Seoul National University",
      country: "South Korea",
      profileImage: null,
      createdAt: new Date(),
    };
    this.users.set(testUser.id, testUser);

    // Add some sample items for demo (more items for infinite scroll testing)
    const sampleItems: Item[] = [
      {
        id: "item1",
        title: "MacBook Pro 13인치 (2020)",
        description: "거의 새 상품입니다. 학업용으로 사용했고 보호필름과 케이스를 항상 사용했습니다.",
        price: "1200.00",
        category: "전자기기",
        condition: "거의 새 것",
        images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Yonsei University",
        country: "South Korea",
        location: "신촌역 근처",
        isAvailable: true,
        views: 45,
        likes: 8,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: "item2", 
        title: "IKEA 책상과 의자 세트",
        description: "이사로 인해 판매합니다. 상태 양호하고 조립 설명서도 있습니다.",
        price: "80.00",
        category: "가구",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Korea University",
        country: "South Korea", 
        location: "안암동",
        isAvailable: true,
        views: 23,
        likes: 3,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      {
        id: "item3",
        title: "경제학 원론 교재",
        description: "수업에서 사용했던 교재입니다. 깨끗한 상태이고 필기는 연필로만 했습니다.",
        price: "25.00",
        category: "도서",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Ewha Womans University",
        country: "South Korea",
        location: "이대역 앞",
        isAvailable: true,
        views: 12,
        likes: 2,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      // Add more items for infinite scroll testing
      {
        id: "item4",
        title: "iPhone 12 Pro 128GB",
        description: "상태 좋은 아이폰입니다. 액정보호필름과 케이스 포함.",
        price: "650.00",
        category: "전자기기",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "test_user",
        school: "Seoul National University",
        country: "South Korea",
        location: "관악구",
        isAvailable: true,
        views: 67,
        likes: 15,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: "item5",
        title: "스타벅스 텀블러 세트",
        description: "새로 산 텀블러인데 중복으로 받아서 판매합니다.",
        price: "15.00",
        category: "생활용품",
        condition: "새 상품",
        images: ["https://images.unsplash.com/photo-1544716278-e513176f20a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "test_user",
        school: "Seoul National University",
        country: "South Korea",
        location: "신림역",
        isAvailable: true,
        views: 8,
        likes: 1,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: "item6",
        title: "나이키 운동화 (270mm)",
        description: "몇 번 안 신은 운동화입니다. 사이즈가 맞지 않아 판매합니다.",
        price: "45.00",
        category: "의류",
        condition: "거의 새 것",
        images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Hanyang University",
        country: "South Korea",
        location: "왕십리역",
        isAvailable: true,
        views: 32,
        likes: 6,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        id: "item7",
        title: "요가매트 + 요가블록 세트",
        description: "운동 시작하려고 샀는데 사용할 시간이 없어서 판매합니다.",
        price: "30.00",
        category: "스포츠",
        condition: "새 상품",
        images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "test_user",
        school: "Seoul National University",
        country: "South Korea",
        location: "봉천역",
        isAvailable: true,
        views: 19,
        likes: 4,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      },
      {
        id: "item8",
        title: "토익 교재 세트 (LC+RC)",
        description: "토익 점수 달성해서 더 이상 필요없어 판매합니다. 깨끗해요.",
        price: "20.00",
        category: "도서",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Sungkyunkwan University",
        country: "South Korea",
        location: "혜화역",
        isAvailable: true,
        views: 28,
        likes: 7,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        id: "item9",
        title: "미니 냉장고 (원룸용)",
        description: "기숙사에서 사용했던 미니 냉장고입니다. 이사로 인해 판매.",
        price: "120.00",
        category: "가전제품",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "test_user",
        school: "Seoul National University",
        country: "South Korea",
        location: "샤로수길",
        isAvailable: true,
        views: 41,
        likes: 12,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago
      },
      {
        id: "item10",
        title: "블루투스 헤드폰 (소니)",
        description: "음질 좋은 소니 헤드폰입니다. 충전 케이블 포함.",
        price: "85.00",
        category: "전자기기",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Hongik University",
        country: "South Korea",
        location: "홍대입구역",
        isAvailable: true,
        views: 33,
        likes: 9,
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) // 18 days ago
      },
      {
        id: "item11",
        title: "캠퍼스 백팩 (노스페이스)",
        description: "수업 들을 때 사용했던 백팩입니다. 노트북 수납 가능.",
        price: "40.00",
        category: "가방",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "test_user",
        school: "Seoul National University",
        country: "South Korea",
        location: "서울대입구역",
        isAvailable: true,
        views: 15,
        likes: 3,
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) // 3 weeks ago
      },
      {
        id: "item12",
        title: "전기포트 + 머그컵 세트",
        description: "기숙사 생활용으로 샀던 전기포트와 머그컵 세트입니다.",
        price: "25.00",
        category: "생활용품",
        condition: "양호",
        images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"],
        sellerId: "user1",
        school: "Kyung Hee University",
        country: "South Korea",
        location: "회기역",
        isAvailable: true,
        views: 21,
        likes: 5,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
      }
    ];

    sampleItems.forEach(item => {
      this.items.set(item.id, item);
    });
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
      profileImage: insertUser.profileImage || null,
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
      images: item.images || [],
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
