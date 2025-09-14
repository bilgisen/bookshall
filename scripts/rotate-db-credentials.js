const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function rotateCredentials() {
  try {
    // Initialize Supabase client with admin credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate new password
    const newPassword = generateSecurePassword();
    
    // Update database password
    const { data, error } = await supabase.rpc('update_database_password', {
      new_password: newPassword
    });
    
    if (error) {
      console.error('Error rotating database password:', error);
      process.exit(1);
    }
    
    // Update environment variables
    const updatedEnv = {
      ...process.env,
      POSTGRES_PASSWORD: newPassword,
      POSTGRES_URL: process.env.POSTGRES_URL.replace(/:[^:]*@/, `:${newPassword}@`),
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL.replace(/:[^:]*@/, `:${newPassword}@`),
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING.replace(/:[^:]*@/, `:${newPassword}@`)
    };
    
    // Generate new .env content
    const envContent = Object.entries(updatedEnv)
      .filter(([key]) => key !== '_' && key !== 'NODE_ENV')
      .map(([key, value]) => `${key}="${value}"`)
      .join('\n');
    
    console.log('New database password has been set.');
    console.log('Please update your .env file with the following values:');
    console.log('\n' + envContent + '\n');
    
    // Generate new JWT secret
    console.log('Generating new JWT secret...');
    const newJwtSecret = generateSecurePassword(64);
    console.log('New JWT secret:', newJwtSecret);
    console.log('\nPlease update your Supabase project settings with the new JWT secret.');
    
  } catch (error) {
    console.error('Error rotating credentials:', error);
    process.exit(1);
  }
}

function generateSecurePassword(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]\\:;?><,./-=';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

// Run the rotation
rotateCredentials();
