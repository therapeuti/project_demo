const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommunityPost = sequelize.define('CommunityPost', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true // JSON 형태로 이미지 경로들 저장
  },
  tags: {
    type: DataTypes.STRING(200),
    allowNull: true // 쉼표로 구분된 태그들
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  viewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted'),
    defaultValue: 'active'
  }
});

const CommunityComment = sequelize.define('CommunityComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'CommunityPost',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 대댓글인 경우 부모 댓글 ID
    references: {
      model: 'CommunityComment',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted'),
    defaultValue: 'active'
  }
});

module.exports = {
  CommunityPost,
  CommunityComment
};