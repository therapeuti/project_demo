const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Diary = sequelize.define('Diary', {
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
  petId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Pet',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  weather: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  weatherIcon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  temperature: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true // JSON 형태로 이미지 경로들 저장
  },
  userContent: {
    type: DataTypes.TEXT,
    allowNull: true // 사용자가 입력한 내용
  },
  aiContent: {
    type: DataTypes.TEXT,
    allowNull: false // LLM이 생성한 일기 내용
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isBookmarked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    defaultValue: 'published'
  }
});

module.exports = Diary;