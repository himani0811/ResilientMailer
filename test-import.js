import { EmailService } from './src/EmailService.js';

console.log('Testing basic email service import...');

try {
  const service = new EmailService({ logLevel: 'error' });
  console.log('✅ EmailService imported and created successfully');
  
  const status = service.getStatus();
  console.log('✅ Service status retrieved:', {
    providers: status.providers.length,
    currentProvider: status.currentProvider
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
