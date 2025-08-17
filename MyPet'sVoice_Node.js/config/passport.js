const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models');

// Serialize/Deserialize User
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, async (username, password, done) => {
  try {
    const user = await User.findOne({
      where: { username: username }
    });

    if (!user) {
      return done(null, false, { message: '존재하지 않는 사용자입니다.' });
    }

    if (user.socialProvider !== 'local') {
      return done(null, false, { message: '소셜 로그인 계정입니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
    }

    if (!user.isEmailVerified) {
      return done(null, false, { message: '이메일 인증이 필요합니다.' });
    }

    if (user.status !== 'active') {
      return done(null, false, { message: '비활성화된 계정입니다.' });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        where: {
          socialProvider: 'google',
          socialId: profile.id
        }
      });

      if (user) {
        return done(null, user);
      }

      // 이메일로 기존 계정 확인
      user = await User.findOne({
        where: { email: profile.emails[0].value }
      });

      if (user) {
        return done(null, false, { message: '이미 가입된 이메일입니다.' });
      }

      // 새 사용자 생성
      user = await User.create({
        email: profile.emails[0].value,
        name: profile.displayName,
        nickname: profile.displayName,
        username: `google_${profile.id}`,
        socialProvider: 'google',
        socialId: profile.id,
        isEmailVerified: true,
        profileImage: profile.photos[0]?.value
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Kakao Strategy
if (process.env.KAKAO_CLIENT_ID) {
  passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: "/api/auth/kakao/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        where: {
          socialProvider: 'kakao',
          socialId: profile.id
        }
      });

      if (user) {
        return done(null, user);
      }

      const email = profile._json.kakao_account?.email;
      if (email) {
        user = await User.findOne({ where: { email } });
        if (user) {
          return done(null, false, { message: '이미 가입된 이메일입니다.' });
        }
      }

      user = await User.create({
        email: email || `kakao_${profile.id}@noemail.com`,
        name: profile.displayName,
        nickname: profile.displayName,
        username: `kakao_${profile.id}`,
        socialProvider: 'kakao',
        socialId: profile.id,
        isEmailVerified: true,
        profileImage: profile._json.properties?.profile_image
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Naver Strategy
if (process.env.NAVER_CLIENT_ID) {
  passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "/api/auth/naver/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        where: {
          socialProvider: 'naver',
          socialId: profile.id
        }
      });

      if (user) {
        return done(null, user);
      }

      const email = profile.email;
      if (email) {
        user = await User.findOne({ where: { email } });
        if (user) {
          return done(null, false, { message: '이미 가입된 이메일입니다.' });
        }
      }

      user = await User.create({
        email: email || `naver_${profile.id}@noemail.com`,
        name: profile.name,
        nickname: profile.nickname || profile.name,
        username: `naver_${profile.id}`,
        socialProvider: 'naver',
        socialId: profile.id,
        isEmailVerified: true,
        profileImage: profile.profileImage
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = passport;