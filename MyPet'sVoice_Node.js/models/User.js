const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    validate: {
      len: [4, 20],
      isAlphanumeric: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true // 소셜 로그인 사용자는 비밀번호가 없을 수 있음
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  socialProvider: {
    type: DataTypes.ENUM('local', 'kakao', 'naver', 'google'),
    defaultValue: 'local'
  },
  socialId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active'
  }
});

module.exports = User;