import passport from 'passport';
// @ts-ignore
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// @ts-ignore  
import { Strategy as KakaoStrategy } from 'passport-kakao';
// @ts-ignore
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { storage } from './storage';
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
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://1b996db4-2b46-4043-bd81-c1a3847beff0-00-2akh5nzv1zwuu.spock.replit.dev/api/auth/google/callback"
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('Google 계정에서 이메일을 가져올 수 없습니다.'), null);
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);
      
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
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: "/api/auth/kakao/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile._json?.kakao_account?.email;
      const nickname = profile.displayName || profile._json?.properties?.nickname;
      
      if (!email) {
        return done(new Error('카카오 계정에서 이메일을 가져올 수 없습니다.'), null);
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user from Kakao profile
        const username = `kakao_${profile.id}`;
        user = await storage.createUser({
          username,
          email,
          password: '', // OAuth users don't need password
          fullName: nickname || username,
          school: '',
          country: '',
          location: '',
          profileImage: profile._json?.properties?.profile_image || null,
          authProvider: 'kakao',
          kakaoId: profile.id
        });
      } else if (!user.kakaoId) {
        // Link existing account with Kakao
        await storage.updateUser(user.id, {
          kakaoId: profile.id,
          authProvider: user.authProvider === 'email' ? 'email,kakao' : user.authProvider + ',kakao'
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
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
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user from Naver profile
        const username = `naver_${profile.id}`;
        user = await storage.createUser({
          username,
          email,
          password: '', // OAuth users don't need password
          fullName: nickname || username,
          school: '',
          country: '',
          location: '',
          profileImage: profile.profile_image || null,
          authProvider: 'naver',
          naverId: profile.id
        });
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