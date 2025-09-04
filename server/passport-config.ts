import passport from 'passport';
// @ts-ignore
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// @ts-ignore  
import { Strategy as KakaoStrategy } from 'passport-kakao';
// @ts-ignore
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@shared/schema';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Deploy 환경에 맞는 콜백 URL 설정
  const baseURL = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  const googleCallbackURL = `${baseURL}/api/auth/google/callback`;
  
  console.log('🔧 구글 콜백 URL:', googleCallbackURL);
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('Google 계정에서 이메일을 가져올 수 없습니다.'), null);
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);
      
      // Check if user was deleted
      if (user && user.status === 'deleted') {
        return done(new Error('삭제된 계정입니다.'), null);
      }
      
      if (!user) {
        // Create new user from Google profile
        const username = `google_${profile.id}`;
        user = await storage.createUser({
          username,
          email,
          password: '', // OAuth users don't need password
          fullName: profile.displayName || username,
          school: '',
          country: '',
          profileImage: profile.photos?.[0]?.value || null,
          authProvider: 'google',
          googleId: profile.id
        });
      } else if (!user.googleId) {
        // Link existing account with Google
        await storage.updateUser(user.id, {
          googleId: profile.id,
          authProvider: user.authProvider === 'email' ? 'email,google' : user.authProvider + ',google'
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Kakao OAuth Strategy
console.log('🔧 카카오 환경변수 체크:');
console.log('  - KAKAO_CLIENT_ID:', process.env.KAKAO_CLIENT_ID ? 'Present' : 'Missing');
console.log('  - KAKAO_CLIENT_SECRET:', process.env.KAKAO_CLIENT_SECRET ? 'Present' : 'Missing');

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  console.log('✅ 카카오 Strategy 초기화 중...');
  // Deploy 환경에 맞는 콜백 URL 설정
  const baseURL = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  const kakaoCallbackURL = `${baseURL}/api/auth/kakao/callback`;
  
  console.log('🔧 카카오 콜백 URL:', kakaoCallbackURL);
  
  passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: kakaoCallbackURL,
    passReqToCallback: true, // 요청 객체를 콜백에 전달
    authorizationURL: 'https://kauth.kakao.com/oauth/authorize?prompt=login'
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔵 카카오 Passport Strategy 시작');
      console.log('🔵 Access Token:', accessToken ? 'Present' : 'Missing');
      console.log('🔵 Profile Data:', JSON.stringify(profile, null, 2));
      
      const email = profile._json?.kakao_account?.email;
      const nickname = profile.displayName || profile._json?.properties?.nickname;
      const kakaoId = profile.id;
      
      console.log('🔵 추출된 정보:', { email, nickname, kakaoId });
      
      if (!email) {
        console.log('❌ 카카오 계정에서 이메일을 가져올 수 없습니다.');
        return done(new Error('카카오 계정에서 이메일을 가져올 수 없습니다.'), null);
      }

      console.log('🔍 카카오 OAuth 로그인 시도:', { email, kakaoId });

      // Check if user exists with this email or kakaoId
      const existingUserByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const existingUserByKakaoId = await db.select().from(users).where(eq(users.kakaoId, kakaoId)).limit(1);
      
      console.log('🔵 기존 사용자 조회 결과:');
      console.log('  - 이메일로 조회:', existingUserByEmail.length > 0 ? 'Found' : 'Not found');
      console.log('  - 카카오ID로 조회:', existingUserByKakaoId.length > 0 ? 'Found' : 'Not found');
      
      let user = existingUserByEmail[0] || existingUserByKakaoId[0] || null;
      
      if (user) {
        console.log('🔵 기존 사용자 정보:', { 
          id: user.id, 
          email: user.email, 
          status: user.status, 
          kakaoId: user.kakaoId,
          authProvider: user.authProvider 
        });
      }
      
      // 삭제된 사용자인지 확인
      if (user && user.status === 'deleted') {
        console.log('⚠️ 삭제된 계정으로 로그인 시도:', user.id);
        return done(new Error('삭제된 계정입니다. 카카오 연동을 해제하고 다시 시도해주세요.'), null);
      }
      
      if (!user) {
        // Create new user from Kakao profile - needs additional info
        const baseUsername = `kakao_${profile.id}`;
        let username = baseUsername;
        
        // Check if username already exists and generate unique one if needed
        const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existingUsername.length > 0) {
          username = `${baseUsername}_${Date.now()}`;
        }
        
        console.log('🔄 새 카카오 사용자 생성 시도:', { username, email });
        try {
          user = await storage.createUser({
            username,
            email,
            password: '', // OAuth users don't need password
            fullName: nickname || username,
            school: '',
            country: '',
            profileImage: profile._json?.properties?.profile_image || null,
            authProvider: 'kakao',
            kakaoId: profile.id,
            kakaoAccessToken: accessToken // 연결 해제용 토큰 저장
          });
          console.log('✅ 새 카카오 사용자 생성 성공:', user.id);
          // Mark as needing additional info
          (user as any).needsAdditionalInfo = true;
        } catch (createError) {
          console.error('❌ 카카오 사용자 생성 실패:', createError);
          return done(createError, null);
        }
      } else if (!user.kakaoId) {
        // Link existing account with Kakao
        await storage.updateUser(user.id, {
          kakaoId: profile.id,
          kakaoAccessToken: accessToken, // 연결 해제용 토큰 저장
          authProvider: user.authProvider === 'email' ? 'email,kakao' : user.authProvider + ',kakao'
        });
      } else {
        // 기존 카카오 연동 사용자 - 토큰 업데이트
        await storage.updateUser(user.id, {
          kakaoAccessToken: accessToken
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('❌ 카카오 Strategy 오류:', error);
      return done(error, null);
    }
  }));
  console.log('✅ 카카오 Strategy 등록 완료');
} else {
  console.log('❌ 카카오 Strategy 초기화 실패 - 환경변수 누락');
}

// Naver OAuth Strategy
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "/api/auth/naver/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.email;
      const nickname = profile.nickname;
      
      if (!email) {
        return done(new Error('네이버 계정에서 이메일을 가져올 수 없습니다.'), null);
      }

      // Check if user exists with this email
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      let user = existingUser[0] || null;
      
      if (!user) {
        // Create new user from Naver profile - needs additional info
        const baseUsername = `naver_${profile.id}`;
        let username = baseUsername;
        
        // Check if username already exists and generate unique one if needed
        const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existingUsername.length > 0) {
          username = `${baseUsername}_${Date.now()}`;
        }
        
        console.log('🔄 새 네이버 사용자 생성 시도:', { username, email });
        try {
          user = await storage.createUser({
            username,
            email,
            password: '', // OAuth users don't need password
            fullName: nickname || username,
            school: '',
            country: '',
            profileImage: profile.profile_image || null,
            authProvider: 'naver',
            naverId: profile.id
          });
          console.log('✅ 새 네이버 사용자 생성 성공:', user.id);
          // Mark as needing additional info
          (user as any).needsAdditionalInfo = true;
        } catch (createError) {
          console.error('❌ 네이버 사용자 생성 실패:', createError);
          return done(createError, null);
        }
      } else if (!user.naverId) {
        // Link existing account with Naver
        await storage.updateUser(user.id, {
          naverId: profile.id,
          authProvider: user.authProvider === 'email' ? 'email,naver' : user.authProvider + ',naver'
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

export default passport;