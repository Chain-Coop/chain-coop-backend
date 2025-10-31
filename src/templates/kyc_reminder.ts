export function kycReminderTemplate(vars: Record<string, any> = {}) {
  const firstName = vars.firstName || 'Member';
  const kycLevel = vars.kycLevel || 'incomplete';
  const ctaUrl = vars.ctaUrl || 'https://chaincoop.com/kyc';
  return `
  <html>
    <body style="font-family: Arial, sans-serif; color: #222;">
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2>🔐 Complete Your KYC Verification - Chain Coop</h2>
        <p>Hi ${firstName},</p>
        <p>Your KYC is currently <strong>${kycLevel}</strong>. Completing your KYC helps us keep the community secure and unlocks full access to Chain Coop features.</p>
        <ul>
          <li>Secure transactions</li>
          <li>Access advanced membership benefits</li>
          <li>Faster support resolution</li>
        </ul>
        <p>
          <a href="${ctaUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Complete KYC</a>
        </p>
        <p>If you have any questions, reply to this email and our team will assist you.</p>
        <p>— Chain Coop Team</p>
      </div>
    </body>
  </html>`;
}