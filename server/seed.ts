import { db } from "./db";
import { users, items, chatRooms, messages, communityPosts } from "@shared/schema";
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

    // Check if users already exist and skip seeding if they do
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log('Users already exist, skipping user seeding');
      return; // Skip seeding completely
    }

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

    // Create test community posts
    const testCommunityPosts = [
      {
        title: "25-2 오하이오 대학교 한인 순례길 참가",
        content: "안녕하세요! 2025년 2학기에 오하이오주립대학교에서 공부할 예정인 학생입니다. 한인 순례길 모임에 참가하고 싶은데, 혹시 관심 있으신 분들 계신가요?",
        category: "모임방",
        semester: "2025-2", 
        authorId: insertedUsers[0].id,
        school: "Ohio State University",
        country: "미국",
        images: []
      },
      {
        title: "독일 뮌헨대학교 기숙사 정보",
        content: "뮌헨대학교 기숙사에 대한 정보를 공유합니다. 저는 작년에 뮌헨대학교에서 교환학생을 했는데, 기숙사 신청 방법이나 생활 팁 등을 알려드릴 수 있어요!",
        category: "이야기방",
        authorId: insertedUsers[1].id,
        school: "University of Munich",
        country: "독일",
        images: []
      },
      {
        title: "25-1 영국대학교 가지 나눔",
        content: "영국에서 유학 중인 학생들과 함께 가지 나눔 모임을 하려고 합니다. 현지 음식도 함께 나누고 정보도 공유해요!",
        category: "모임방",
        semester: "2025-1",
        authorId: insertedUsers[2].id,
        school: "University of Cambridge",
        country: "영국",
        images: []
      },
      {
        title: "일본 도쿄 맛집 추천",
        content: "도쿄에서 1년간 유학했던 경험을 바탕으로 맛집들을 추천해드려요. 특히 저렴하면서도 맛있는 곳들 위주로 정리했습니다.",
        category: "이야기방",
        authorId: insertedUsers[3].id,
        school: "University of Tokyo",
        country: "일본",
        images: []
      }
    ];

    const insertedPosts = await db.insert(communityPosts).values(testCommunityPosts).returning();
    console.log(`Created ${insertedPosts.length} community posts`);

    console.log("Database seeding completed successfully!");
    
    return {
      users: insertedUsers,
      items: insertedItems,
      chatRoom: testChatRoom[0],
      communityPosts: insertedPosts
    };
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}