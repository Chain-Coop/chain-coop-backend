import dotenv from 'dotenv';
dotenv.config();

// Import the existing Resend integration via our EmailService
import EmailServiceInstance, { EmailService as EmailServiceClass } from '../src/services/emailService';

type Template = 'kyc_reminder' | 'activation_reminder' | 'reengagement';

function getArg(name: string, fallback?: string) {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith(`--${name}=`)) return a.split('=')[1];
    if (a === `--${name}` && i + 1 < argv.length) return argv[i + 1];
  }
  return fallback;
}

async function main() {
  const to = getArg('to');
  const template = (getArg('template') as Template) || 'activation_reminder';
  if (!to) {
    console.error('Missing required arg: --to <email>');
    process.exit(1);
  }

  // Build variables from common flags (optional)
  const variables: Record<string, any> = {};
  const firstName = getArg('firstName');
  const kycLevel = getArg('kycLevel');
  const ctaUrl = getArg('ctaUrl');
  const activateUrl = getArg('activateUrl');
  const featuresUrl = getArg('featuresUrl');
  if (firstName) variables.firstName = firstName;
  if (kycLevel) variables.kycLevel = kycLevel;
  if (ctaUrl) variables.ctaUrl = ctaUrl;
  if (activateUrl) variables.activateUrl = activateUrl;
  if (featuresUrl) variables.featuresUrl = featuresUrl;

  // Use the singleton instance that reflects current env
  const service = EmailServiceInstance || EmailServiceClass.getInstance();

  console.log('EmailService status:', service.getStatus());
  console.log(`Sending template '${template}' to '${to}' ...`);
  try {
    const result = await service.sendTemplateEmail({ recipient: to, template, variables });
    console.log('Send result:', result);
    process.exit(0);
  } catch (err: any) {
    console.error('Send failed:', err?.message || err);
    process.exit(2);
  }
}

main();