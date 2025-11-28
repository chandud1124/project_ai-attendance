// Simple test to verify face recognition database loading
import https from 'https';

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNzM4YjYzYjc0ZjFiNjBjMGViMTg2YjBkNWRmYzI2MyIsImVtYWlsIjoiYWRtaW5AaW5zdGl0dXRlLmVkdSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MjMxMzUyNywiZXhwIjoxNzYyOTE4MzI3fQ.kvaRjJnEdDHleHQoA2IkU2tyny82QHXadmtwu4RybLc';

console.log('Testing face recognition database...');

// Make API call to get users with photos
const options = {
  hostname: 'localhost',
  port: 3500,
  path: '/api/users',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      console.log(`Found ${users.length} total users`);

      const usersWithPhotos = users.filter(user => user.photo);
      console.log(`Found ${usersWithPhotos.length} users with photos`);

      const adminUser = usersWithPhotos.find(user => user.email === 'admin@institute.edu');
      if (adminUser) {
        console.log('✅ Admin user has photo:', adminUser.full_name);
        console.log('Photo length:', adminUser.photo.length, 'characters');
      } else {
        console.log('❌ Admin user not found or has no photo');
      }

      // Check if face recognition would load these users
      console.log('\nUsers that would be loaded for face recognition:');
      usersWithPhotos.forEach(user => {
        console.log(`- ${user.full_name} (${user.email}): ${user.photo ? 'Has photo' : 'No photo'}`);
      });

    } catch (error) {
      console.error('Error parsing response:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();