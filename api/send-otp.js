import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan metode POST.' });
  }

  try {
    const { email, otp, fullName } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: 'Parameter email dan kode OTP wajib diisi.' });
    }

    const smtpUser = process.env.SMTP_USER || 'agihamdani88@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'bapiyytiwfjguzak';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpFromName = process.env.SMTP_FROM_NAME || 'SASI CBT Indonesia';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const recipientName = fullName ? fullName.trim() : 'Bapak/Ibu Petugas Asesmen';

    const mailOptions = {
      from: `"${smtpFromName}" <${smtpUser}>`,
      to: email.trim(),
      subject: `[SASI CBT] ${otp} adalah Kode Verifikasi Lupa Kata Sandi Anda`,
      html: `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifikasi Lupa Sandi SASI CBT</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
            
            <!-- HEADER -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                PORTAL KEAMANAN AKUN
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">SASI CBT INDONESIA</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #dbeafe; font-weight: 500;">Sistem Asesmen Sekolah Indonesia Terpadu</p>
            </div>

            <!-- BODY -->
            <div style="padding: 36px 28px; color: #1e293b;">
              <h2 style="margin: 0 0 14px 0; font-size: 19px; color: #0f172a; font-weight: 800;">
                Halo, ${recipientName} 👋
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.65; color: #475569;">
                Kami menerima permintaan untuk mereset kata sandi akun petugas Anda pada platform <strong>SASI CBT</strong>. Silakan gunakan 6-digit Kode Verifikasi (OTP) berikut untuk melanjutkan:
              </p>

              <!-- KOTAK KODE OTP -->
              <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #22c55e; border-radius: 16px; padding: 18px 42px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);">
                  <div style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                    KODE VERIFIKASI RESMI
                  </div>
                  <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #166534;">
                    ${otp}
                  </div>
                </div>
              </div>

              <!-- PERINGATAN KEAMANAN -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin: 26px 0;">
                <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">
                  ⚠️ <strong>PENTING:</strong> Kode ini bersifat rahasia dan hanya berlaku selama <strong>5 menit</strong>. Jangan pernah membagikan kode OTP ini kepada siapa pun demi keamanan naskah soal dan data penilaian sekolah.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                Jika Anda tidak pernah meminta pengaturan ulang kata sandi ini, abaikan email ini. Akun dan seluruh data asesmen Anda tetap aman.
              </p>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 28px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0; font-weight: 700; color: #64748b;">Sistem Asesmen Sekolah Indonesia (SASI CBT)</p>
              <p style="margin: 4px 0 0 0;">Didukung oleh Tim Pengembang Asesmen Digital Nasional</p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">Pesan ini dikirimkan secara otomatis dari server pengirim: ${smtpUser}. Mohon tidak membalas email ini.</p>
            </div>

          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent successfully:', info.messageId, 'to:', email);

    return res.status(200).json({
      success: true,
      message: 'Kode OTP verifikasi berhasil dikirim ke alamat email Anda.',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return res.status(500).json({
      error: 'Gagal mengirimkan email OTP melalui server SMTP.',
      details: error.message
    });
  }
}
