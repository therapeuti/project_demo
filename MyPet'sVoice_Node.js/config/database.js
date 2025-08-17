const { Sequelize } = require('sequelize');
require('dotenv').config();

// SQLite를 사용하여 데모를 더 쉽게 실행할 수 있도록 설정
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  }
});

// 연결 테스트
sequelize
  .authenticate()
  .then(() => {
    console.log('SQLite 데이터베이스 연결 성공');
  })
  .catch(err => {
    console.error('SQLite 데이터베이스 연결 실패:', err);
  });

module.exports = sequelize;