const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"MyPet's Voice" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '[MyPet\'s Voice] 이메일 인증',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #4CAF50; text-align: center;">MyPet's Voice</h1>
        <h2 style="color: #333;">이메일 인증</h2>
        <p>안녕하세요!</p>
        <p>MyPet's Voice 회원가입을 완료하기 위해 아래 버튼을 클릭하여 이메일을 인증해주세요.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            이메일 인증하기
          </a>
        </div>
        <p>만약 버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
        <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          이 인증 링크는 24시간 후에 만료됩니다.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail
};