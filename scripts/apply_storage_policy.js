import postgres from 'postgres';
import 'dotenv/config'; // Make sure to install dotenv or run with -r dotenv/config

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing in environment variables.');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  console.log('Applying RLS policies for "chat-media" bucket...');

  try {
    // 1. Create a policy to allow anyone to READ (public bucket) - already public, but let's ensure objects are readable.
    // The bucket is 'chat-media'.
    
    // Note: The 'storage' schema is managed by Supabase. We interact with 'storage.objects'.
    
    // Policy: Allow authenticated users to UPLOAD to 'chat-media'
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Allow authenticated uploads'
        ) THEN
          CREATE POLICY "Allow authenticated uploads"
          ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK ( bucket_id = 'chat-media' );
        END IF;
      END
      $$;
    `;
    console.log('✅ Policy "Allow authenticated uploads" applied.');

    // Policy: Allow anyone to VIEW (Select) files in 'chat-media'
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Allow public viewing'
        ) THEN
          CREATE POLICY "Allow public viewing"
          ON storage.objects
          FOR SELECT
          TO public
          USING ( bucket_id = 'chat-media' );
        END IF;
      END
      $$;
    `;
    console.log('✅ Policy "Allow public viewing" applied.');
    
    // Policy: Allow users to UPDATE their own files (optional but good)
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Allow individual updates'
        ) THEN
          CREATE POLICY "Allow individual updates"
          ON storage.objects
          FOR UPDATE
          TO authenticated
          USING ( bucket_id = 'chat-media' AND owner = auth.uid() )
          WITH CHECK ( bucket_id = 'chat-media' AND owner = auth.uid() );
        END IF;
      END
      $$;
    `;
    console.log('✅ Policy "Allow individual updates" applied.');

  } catch (error) {
    console.error('Error applying policies:', error);
  } finally {
    await sql.end();
  }
}

main();
