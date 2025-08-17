const User = require('./User');
const Pet = require('./Pet');
const Diary = require('./Diary');
const { CommunityPost, CommunityComment } = require('./Community');

// 관계 설정
// User와 Pet 관계 (1:N)
User.hasMany(Pet, { foreignKey: 'userId', onDelete: 'CASCADE' });
Pet.belongsTo(User, { foreignKey: 'userId' });

// User와 Diary 관계 (1:N)
User.hasMany(Diary, { foreignKey: 'userId', onDelete: 'CASCADE' });
Diary.belongsTo(User, { foreignKey: 'userId' });

// Pet과 Diary 관계 (1:N)
Pet.hasMany(Diary, { foreignKey: 'petId', onDelete: 'CASCADE' });
Diary.belongsTo(Pet, { foreignKey: 'petId' });

// User와 CommunityPost 관계 (1:N)
User.hasMany(CommunityPost, { foreignKey: 'userId', onDelete: 'CASCADE' });
CommunityPost.belongsTo(User, { foreignKey: 'userId' });

// User와 CommunityComment 관계 (1:N)
User.hasMany(CommunityComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
CommunityComment.belongsTo(User, { foreignKey: 'userId' });

// CommunityPost와 CommunityComment 관계 (1:N)
CommunityPost.hasMany(CommunityComment, { foreignKey: 'postId', onDelete: 'CASCADE' });
CommunityComment.belongsTo(CommunityPost, { foreignKey: 'postId' });

// CommunityComment 자기참조 (대댓글)
CommunityComment.hasMany(CommunityComment, { 
  foreignKey: 'parentId', 
  as: 'replies',
  onDelete: 'CASCADE' 
});
CommunityComment.belongsTo(CommunityComment, { 
  foreignKey: 'parentId', 
  as: 'parent' 
});

module.exports = {
  User,
  Pet,
  Diary,
  CommunityPost,
  CommunityComment
};