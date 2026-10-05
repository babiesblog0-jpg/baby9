require('dotenv').config();
const { s3Client, R2_BUCKET } = require('./config/r2');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

async function testR2() {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: 'test.txt',
      Body: 'Hello World',
      ContentType: 'text/plain',
    });
    const result = await s3Client.send(command);
    console.log('Success!', result);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testR2();
