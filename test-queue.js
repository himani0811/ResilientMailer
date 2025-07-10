import { EmailQueue } from './src/EmailQueue.js';

console.log('🚀 Testing Email Queue...\n');

const queue = new EmailQueue({
  logLevel: 'info',
  processInterval: 1000,
  maxConcurrency: 2
});

// Add some test emails
const emails = [
  {
    to: 'high-priority@example.com',
    subject: 'High Priority Email',
    body: 'This is a high priority message',
    from: 'urgent@company.com'
  },
  {
    to: 'normal@example.com',
    subject: 'Normal Priority Email', 
    body: 'This is a normal priority message',
    from: 'info@company.com'
  },
  {
    to: 'low-priority@example.com',
    subject: 'Low Priority Email',
    body: 'This is a low priority message',
    from: 'newsletter@company.com'
  }
];

try {
  console.log('📬 Adding emails to queue...');
  
  // Add emails with different priorities
  const id1 = await queue.addEmail(emails[1], { priority: 1 }); // Normal
  const id2 = await queue.addEmail(emails[0], { priority: 10 }); // High
  const id3 = await queue.addEmail(emails[2], { priority: 0 }); // Low
  
  console.log('✅ Emails added:', [id1, id2, id3]);
  
  console.log('\n📊 Queue stats before processing:', queue.getStats());
  
  // Start processing
  console.log('\n🔄 Starting queue processing...');
  const processingPromise = queue.startProcessing();
  
  // Stop after 5 seconds
  setTimeout(() => {
    queue.stopProcessing();
    console.log('\n⏹️ Queue processing stopped');
    console.log('📊 Final stats:', queue.getStats());
    
    // Show queue items
    const items = queue.getQueueItems({ limit: 10 });
    console.log('\n📋 Queue items:', items);
  }, 5000);
  
  await processingPromise;
  
} catch (error) {
  console.error('❌ Queue test failed:', error.message);
}
