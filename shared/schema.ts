import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
  naverId: text("naver_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  condition: text("condition").notNull(),
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
  status: text("status").default("거래가능").notNull(), // "거래가능", "거래완료", "거래기간만료"
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: text("room_id").notNull().references(() => chatRooms.id),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // "이야기방", "모임방"
  semester: text("semester"), // For meeting posts: "2024-1", "2024-2", etc.
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

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  itemId: text("item_id").notNull().references(() => items.id),
  reason: text("reason").notNull(), // "부적절한 내용", "사기 의심", "스팸/광고", "기타"
  description: text("description"),
  status: text("status").default("pending").notNull(), // "pending", "reviewed", "resolved"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  sellerId: true,
  views: true,
  likes: true,
  createdAt: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  likes: true,
  views: true,
  commentsCount: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  authorId: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  reporterId: true,
  status: true,
  createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().min(1, "이메일 또는 사용자명을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
