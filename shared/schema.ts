import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  school: text("school").notNull(),
  country: text("country").notNull(),
  profileImage: text("profile_image"),
  preferredCurrency: text("preferred_currency").default("USD").notNull(),
  role: text("role").default("user").notNull(),
  status: text("status").default("active").notNull(),
  authProvider: text("auth_provider").default("email").notNull(),
  googleId: text("google_id"),
  kakaoId: text("kakao_id"),
  kakaoAccessToken: text("kakao_access_token"), // 카카오 연결 해제용 토큰
  naverId: text("naver_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  condition: text("condition").notNull(),
  category: text("category").default("전자기기").notNull(),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  sellerId: text("seller_id").notNull().references(() => users.id),
  school: text("school").notNull(),
  country: text("country").notNull(),
  currency: varchar("currency", { length: 10 }).default("KRW"),
  location: text("location").notNull(),
  deliveryMethod: text("delivery_method"),
  customDeliveryMethod: text("custom_delivery_method"),
  availableFrom: timestamp("available_from"),
  availableTo: timestamp("available_to"),
  status: text("status").default("거래가능").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: text("item_id").notNull().references(() => items.id),
  buyerId: text("buyer_id").notNull().references(() => users.id),
  sellerId: text("seller_id").notNull().references(() => users.id),
  hiddenForBuyer: boolean("hidden_for_buyer").default(false).notNull(),
  hiddenForSeller: boolean("hidden_for_seller").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: text("room_id").notNull().references(() => chatRooms.id),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("user").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  semester: text("semester"),
  openChatLink: text("open_chat_link"),
  authorId: text("author_id").notNull().references(() => users.id),
  school: text("school").notNull(),
  country: text("country").notNull(),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  likes: integer("likes").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: text("post_id").notNull().references(() => communityPosts.id),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favorites = pgTable("favorites", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull().references(() => users.id),
    itemId: text("item_id").notNull().references(() => items.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    content: text("content").notNull(),
    link: text("link"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    reporterId: text("reporter_id").notNull().references(() => users.id),
    itemId: text("item_id").notNull().references(() => items.id),
    reason: text("reason").notNull(),
    description: text("description"),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    baseCurrency: text("base_currency").default("KRW").notNull(),
    rates: text("rates").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// Zod Schemas for validation
export const insertUserSchema = createInsertSchema(users);

// 상품 등록을 위한 커스텀 스키마 - 날짜 필드 변환 처리
export const insertItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  condition: z.string(),
  category: z.string().optional(),
  images: z.array(z.string()),
  sellerId: z.string(),
  school: z.string(),
  country: z.string(),
  currency: z.string().optional(),
  location: z.string(),
  deliveryMethod: z.string().optional(),
  customDeliveryMethod: z.string().optional(),
  availableFrom: z.union([
    z.date(),
    z.string().transform((val) => val ? new Date(val) : null),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  availableTo: z.union([
    z.date(),
    z.string().transform((val) => val ? new Date(val) : null),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  status: z.string().optional(),
  isAvailable: z.boolean().optional(),
  views: z.number().optional(),
  likes: z.number().optional()
});
export const insertCommunityPostSchema = createInsertSchema(communityPosts);
export const insertCommentSchema = createInsertSchema(comments);

// Select Schemas for types
export const selectUserSchema = createSelectSchema(users);
export const selectItemSchema = createSelectSchema(items);
export const selectFavoriteSchema = createSelectSchema(favorites);
export const selectChatRoomSchema = createSelectSchema(chatRooms);
export const selectMessageSchema = createSelectSchema(messages);
export const selectCommunityPostSchema = createSelectSchema(communityPosts);
export const selectCommentSchema = createSelectSchema(comments);
export const selectNotificationSchema = createSelectSchema(notifications);
export const selectReportSchema = createSelectSchema(reports);

// Insert Schemas for additional types
export const insertChatRoomSchema = createInsertSchema(chatRooms);
export const insertMessageSchema = createInsertSchema(messages);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertReportSchema = createInsertSchema(reports);

// Types inferred from Zod schemas
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = z.infer<typeof selectItemSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Favorite = z.infer<typeof selectFavoriteSchema> & { item?: Item };
export type ChatRoom = z.infer<typeof selectChatRoomSchema>;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Message = z.infer<typeof selectMessageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CommunityPost = z.infer<typeof selectCommunityPostSchema>;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type Comment = z.infer<typeof selectCommentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Notification = z.infer<typeof selectNotificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Report = z.infer<typeof selectReportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export const registerSchema = insertUserSchema.omit({
  fullName: true // fullName을 제외하고 나중에 username으로 대체
}).extend({
  fullName: z.string().default(""), // fullName을 선택적으로 만들고 기본값을 빈 문자열로 설정
  confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;