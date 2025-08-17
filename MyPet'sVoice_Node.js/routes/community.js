const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { CommunityPost, CommunityComment, User } = require('../models');
const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/community/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 게시글 목록 조회
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, search, sortBy = 'latest' } = req.query;
    const offset = (page - 1) * limit;

    let where = { status: 'active' };
    let order;

    const { Op } = require('sequelize');

    // 태그 필터링
    if (tag) {
      where.tags = { [Op.like]: `%${tag}%` };
    }

    // 검색 필터링
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    // 정렬
    switch (sortBy) {
      case 'popular':
        order = [['likesCount', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'comments':
        order = [['commentsCount', 'DESC'], ['createdAt', 'DESC']];
        break;
      default:
        order = [['createdAt', 'DESC']];
    }

    const posts = await CommunityPost.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      posts: posts.rows,
      totalCount: posts.count,
      totalPages: Math.ceil(posts.count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({ error: '게시글 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 게시글 상세 조회
router.get('/posts/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findByPk(postId, {
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }]
    });

    if (!post || post.status !== 'active') {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    post.viewsCount += 1;
    await post.save();

    // 댓글 조회
    const comments = await CommunityComment.findAll({
      where: { 
        postId: postId,
        status: 'active',
        parentId: null // 최상위 댓글만
      },
      include: [
        {
          model: User,
          attributes: ['id', 'nickname', 'profileImage']
        },
        {
          model: CommunityComment,
          as: 'replies',
          include: [{
            model: User,
            attributes: ['id', 'nickname', 'profileImage']
          }],
          where: { status: 'active' },
          required: false
        }
      ],
      order: [['createdAt', 'ASC'], ['replies', 'createdAt', 'ASC']]
    });

    res.json({
      post,
      comments
    });

  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
});

// 게시글 작성
router.post('/posts', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: '제목은 200자 이하로 입력해주세요.' });
    }

    // 이미지 경로 처리
    const imagePaths = req.files ? req.files.map(file => `/uploads/community/${file.filename}`) : [];

    const post = await CommunityPost.create({
      userId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : null,
      tags: tags ? tags.trim() : null
    });

    const createdPost = await CommunityPost.findByPk(post.id, {
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '게시글이 작성되었습니다.',
      post: createdPost
    });

  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ error: '게시글 작성 중 오류가 발생했습니다.' });
  }
});

// 게시글 수정
router.put('/posts/:postId', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, tags } = req.body;

    const post = await CommunityPost.findOne({
      where: { 
        id: postId, 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (tags !== undefined) updateData.tags = tags ? tags.trim() : null;

    // 새 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map(file => `/uploads/community/${file.filename}`);
      updateData.images = JSON.stringify(imagePaths);
    }

    await post.update(updateData);

    const updatedPost = await CommunityPost.findByPk(post.id, {
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }]
    });

    res.json({
      message: '게시글이 수정되었습니다.',
      post: updatedPost
    });

  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ error: '게시글 수정 중 오류가 발생했습니다.' });
  }
});

// 게시글 삭제
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findOne({
      where: { 
        id: postId, 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 소프트 삭제
    await post.update({ status: 'deleted' });

    res.json({ message: '게시글이 삭제되었습니다.' });

  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ error: '게시글 삭제 중 오류가 발생했습니다.' });
  }
});

// 게시글 좋아요
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findOne({
      where: { id: postId, status: 'active' }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 실제로는 별도의 Like 테이블을 만들어야 하지만, 데모에서는 단순하게 처리
    post.likesCount += 1;
    await post.save();

    res.json({
      message: '좋아요가 추가되었습니다.',
      likesCount: post.likesCount
    });

  } catch (error) {
    console.error('좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다.' });
  }
});

// 댓글 작성
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    const post = await CommunityPost.findOne({
      where: { id: postId, status: 'active' }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 대댓글인 경우 부모 댓글 확인
    if (parentId) {
      const parentComment = await CommunityComment.findOne({
        where: { 
          id: parentId, 
          postId: postId,
          status: 'active'
        }
      });

      if (!parentComment) {
        return res.status(404).json({ error: '부모 댓글을 찾을 수 없습니다.' });
      }
    }

    const comment = await CommunityComment.create({
      postId: postId,
      userId: req.user.id,
      parentId: parentId || null,
      content: content.trim()
    });

    // 게시글의 댓글 수 증가
    post.commentsCount += 1;
    await post.save();

    const createdComment = await CommunityComment.findByPk(comment.id, {
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '댓글이 작성되었습니다.',
      comment: createdComment
    });

  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.' });
  }
});

// 댓글 수정
router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    const comment = await CommunityComment.findOne({
      where: { 
        id: commentId, 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    await comment.update({ content: content.trim() });

    const updatedComment = await CommunityComment.findByPk(comment.id, {
      include: [{
        model: User,
        attributes: ['id', 'nickname', 'profileImage']
      }]
    });

    res.json({
      message: '댓글이 수정되었습니다.',
      comment: updatedComment
    });

  } catch (error) {
    console.error('댓글 수정 오류:', error);
    res.status(500).json({ error: '댓글 수정 중 오류가 발생했습니다.' });
  }
});

// 댓글 삭제
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await CommunityComment.findOne({
      where: { 
        id: commentId, 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    // 소프트 삭제
    await comment.update({ status: 'deleted' });

    // 게시글의 댓글 수 감소
    const post = await CommunityPost.findByPk(comment.postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    res.json({ message: '댓글이 삭제되었습니다.' });

  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다.' });
  }
});

// 인기 태그 조회
router.get('/tags/popular', async (req, res) => {
  try {
    // 실제로는 더 복잡한 쿼리가 필요하지만 데모에서는 간단하게 처리
    const popularTags = [
      '산책해요',
      '꿀팁',
      '질문',
      '자랑',
      '일상',
      '건강',
      '훈련',
      '놀이',
      '음식',
      '용품추천'
    ];

    res.json({ tags: popularTags });

  } catch (error) {
    console.error('인기 태그 조회 오류:', error);
    res.status(500).json({ error: '인기 태그 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;