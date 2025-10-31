export function reengagementTemplate(vars: Record<string, any> = {}) {
  const firstName = vars.firstName || 'Member';
  const featuresUrl = vars.featuresUrl || 'https://chaincoop.com/features';
  return `
  <html>
    <body style="font-family: Arial, sans-serif; color: #222;">
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2>🚀 We Miss You at Chain Coop!</h2>
        <p>Hi ${firstName},</p>
        <p>We’ve introduced new features and improvements that we think you’ll love. Come back and explore what’s new:</p>
        <ul>
          <li>Enhanced project discovery</li>
          <li>Better wallet integrations</li>
          <li>Streamlined member experience</li>
        </ul>
        <p>
          <a href="${featuresUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Explore Updates</a>
        </p>
        <p>Questions? Reply to this email—we’re here to help.</p>
        <p>— Chain Coop Team</p>
      </div>
    </body>
  </html>`;
}