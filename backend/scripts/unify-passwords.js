const bcrypt = require('bcryptjs');
const fs = require('fs');

const passwordHash = '$2b$10$QkQ1jGp9DvGAmcjWhJ0X1esIfh2IphUFZ8w4fOPug7hO3SM.xJ8Ra';

let content = fs.readFileSync('src/config/memory-db.ts', 'utf8');

content = content.replace(/password: '\$2[ab]\$10\$[^']+/g, (match) => {
  return 'password: ' + passwordHash + "'";
});

fs.writeFileSync('src/config/memory-db.ts', content, 'utf8');

console.log('Updated all passwords to unified hash');
console.log('Hash:', passwordHash);
