import * as path from 'path';
import * as fs from 'fs';

const root2 = path.resolve(__dirname, '..', '..');
const root3 = path.resolve(__dirname, '..', '..', '..');

console.log('__dirname:', __dirname);
console.log('2 levels up:', root2, '| .env exists:', fs.existsSync(path.join(root2, '.env')));
console.log('3 levels up:', root3, '| .env exists:', fs.existsSync(path.join(root3, '.env')));
console.log('cwd:', process.cwd(), '| .env exists:', fs.existsSync(path.join(process.cwd(), '.env')));
