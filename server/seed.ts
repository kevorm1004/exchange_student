import { db } from "./db";
import { users, items, chatRooms, messages } from "@shared/schema";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Create test users
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const testUsers = [
      {
        username: "john_doe",
        email: "john@test.com",
        password: hashedPassword,
        fullName: "John Doe",
        school: "Tokyo University",
        country: "Japan",
        profileImage: null,
        preferredCurrency: "JPY",
        role: "user",
        status: "active"
      },
      {
        username: "sarah_kim",
        email: "sarah@test.com", 
        password: hashedPassword,
        fullName: "Sarah Kim",
        school: "Seoul National University",
        country: "Korea",
        profileImage: null,
        preferredCurrency: "KRW",
        role: "user",
        status: "active"
      },
      {
        username: "mike_chen",
        email: "mike@test.com",
        password: hashedPassword,
        fullName: "Mike Chen",
        school: "Peking University",
        country: "China",
        profileImage: null,
        preferredCurrency: "CNY",
        role: "user", 
        status: "active"
      },
      {
        username: "emma_brown",
        email: "emma@test.com",
        password: hashedPassword,
        fullName: "Emma Brown",
        school: "Harvard University",
        country: "USA",
        profileImage: null,
        preferredCurrency: "USD",
        role: "user",
        status: "active"
      }
    ];

    // Insert users
    const insertedUsers = await db.insert(users).values(testUsers).returning();
    console.log(`Created ${insertedUsers.length} test users`);

    // Create test items
    const testItems = [
      {
        title: "MacBook Pro 13인치 (2021)",
        description: "거의 새것 같은 상태의 맥북입니다. 학업용으로 사용했고, 케이스와 함께 판매합니다.",
        price: "1200.00",
        category: "전자기기",
        condition: "매우좋음",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[0].id,
        school: insertedUsers[0].school,
        country: insertedUsers[0].country,
        location: "Tokyo, Japan",
        isAvailable: true,
        views: 25,
        likes: 3
      },
      {
        title: "아이폰 14 Pro 256GB",
        description: "6개월 사용한 아이폰입니다. 액정보호필름과 케이스 항상 착용했습니다.",
        price: "800.00",
        category: "전자기기", 
        condition: "좋음",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[1].id,
        school: insertedUsers[1].school,
        country: insertedUsers[1].country,
        location: "Seoul, Korea",
        isAvailable: true,
        views: 18,
        likes: 5
      },
      {
        title: "경제학원론 교재 세트",
        description: "맨큐의 경제학 원론 1,2권 세트입니다. 필기 있지만 깨끗한 상태입니다.",
        price: "45.00",
        category: "도서",
        condition: "보통",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[2].id,
        school: insertedUsers[2].school,
        country: insertedUsers[2].country,
        location: "Beijing, China",
        isAvailable: true,
        views: 8,
        likes: 1
      },
      {
        title: "이케아 책상 (LINNMON)",
        description: "공부용으로 사용했던 이케아 책상입니다. 약간의 사용감 있지만 튼튼합니다.",
        price: "35.00",
        category: "가구",
        condition: "보통",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[3].id,
        school: insertedUsers[3].school,
        country: insertedUsers[3].country,
        location: "Boston, USA",
        isAvailable: true,
        views: 12,
        likes: 2
      },
      {
        title: "나이키 에어맥스 270 (사이즈 260)",
        description: "한 번만 신은 거의 새 신발입니다. 발에 안 맞아서 판매합니다.",
        price: "80.00",
        category: "의류",
        condition: "매우좋음",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[0].id,
        school: insertedUsers[0].school,
        country: insertedUsers[0].country,
        location: "Tokyo, Japan",
        isAvailable: true,
        views: 15,
        likes: 4
      },
      {
        title: "블루투스 헤드폰 (Sony WH-1000XM4)",
        description: "노이즈 캔슬링 기능이 훌륭한 소니 헤드폰입니다. 박스와 케이블 모두 포함입니다.",
        price: "180.00",
        category: "전자기기",
        condition: "좋음",
        images: ["/api/placeholder-image.jpg"],
        sellerId: insertedUsers[1].id,
        school: insertedUsers[1].school,
        country: insertedUsers[1].country,
        location: "Seoul, Korea",
        isAvailable: true,
        views: 22,
        likes: 6
      }
    ];

    // Insert items
    const insertedItems = await db.insert(items).values(testItems).returning();
    console.log(`Created ${insertedItems.length} test items`);

    // Create test chat rooms and messages
    const testChatRoom = await db.insert(chatRooms).values({
      itemId: insertedItems[0].id, // MacBook Pro
      buyerId: insertedUsers[1].id, // Sarah
      sellerId: insertedUsers[0].id  // John
    }).returning();

    const testMessages = [
      {
        roomId: testChatRoom[0].id,
        senderId: insertedUsers[1].id, // Sarah (buyer)
        content: "안녕하세요! 맥북 구매에 관심이 있습니다.",
        messageType: "text"
      },
      {
        roomId: testChatRoom[0].id,
        senderId: insertedUsers[0].id, // John (seller)
        content: "안녕하세요! 네, 관심 가져주셔서 감사합니다. 궁금한 점이 있으시면 언제든 물어보세요.",
        messageType: "text"
      },
      {
        roomId: testChatRoom[0].id,
        senderId: insertedUsers[1].id, // Sarah
        content: "혹시 직접 보고 구매할 수 있을까요? 그리고 가격 협상도 가능한지요?",
        messageType: "text"
      },
      {
        roomId: testChatRoom[0].id,
        senderId: insertedUsers[0].id, // John
        content: "네, 직접 보시는 것 가능합니다. 도쿄대 근처에서 만날까요? 가격은 조금 협상 가능해요.",
        messageType: "text"
      }
    ];

    await db.insert(messages).values(testMessages);
    console.log(`Created chat room with ${testMessages.length} messages`);

    console.log("Database seeding completed successfully!");
    
    return {
      users: insertedUsers,
      items: insertedItems,
      chatRoom: testChatRoom[0]
    };
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}