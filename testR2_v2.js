require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testR2() {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    // NOT using forcePathStyle
  });
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
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
