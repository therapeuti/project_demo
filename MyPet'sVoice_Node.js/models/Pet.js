const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pet = sequelize.define('Pet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  species: {
    type: DataTypes.STRING(50),
    allowNull: false // 대분류 (개, 고양이 등)
  },
  breed: {
    type: DataTypes.STRING(100),
    allowNull: true // 소분류 (골든리트리버, 페르시안 등)
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: true
  },
  isNeutered: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // AI 채팅용 설정
  speechStyle: {
    type: DataTypes.TEXT,
    allowNull: true // 말투 설정
  },
  userNickname: {
    type: DataTypes.STRING(50),
    allowNull: true // 사용자 호칭
  },
  personality: {
    type: DataTypes.TEXT,
    allowNull: true // 성격 설정
  },
  // 추가 정보
  likes: {
    type: DataTypes.TEXT,
    allowNull: true // 좋아하는 것
  },
  dislikes: {
    type: DataTypes.TEXT,
    allowNull: true // 싫어하는 것
  },
  habits: {
    type: DataTypes.TEXT,
    allowNull: true // 습관 및 행동양식
  },
  characteristics: {
    type: DataTypes.TEXT,
    allowNull: true // 특징
  },
  family: {
    type: DataTypes.TEXT,
    allowNull: true // 가족관계
  },
  otherInfo: {
    type: DataTypes.TEXT,
    allowNull: true // 기타 대화에 반영할 정보
  },
  // 건강 정보
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diseases: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  surgeries: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  healthNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
});

module.exports = Pet;