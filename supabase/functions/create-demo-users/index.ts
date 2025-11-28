import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemoUser {
  email: string;
  password: string;
  full_name: string;
  role: 'super_admin' | 'dept_admin' | 'teacher' | 'student' | 'technician';
}

const demoUsers: DemoUser[] = [
  {
    email: 'admin@institute.edu',
    password: 'Admin@123',
    full_name: 'System Administrator',
    role: 'super_admin'
  },
  {
    email: 'dept@institute.edu',
    password: 'Dept@123',
    full_name: 'Department Administrator',
    role: 'dept_admin'
  },
  {
    email: 'teacher@institute.edu',
    password: 'Teacher@123',
    full_name: 'John Teacher',
    role: 'teacher'
  },
  {
    email: 'student@institute.edu',
    password: 'Student@123',
    full_name: 'Jane Student',
    role: 'student'
  },
  {
    email: 'tech@institute.edu',
    password: 'Tech@123',
    full_name: 'Technical Support',
    role: 'technician'
  }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const results = [];
    
    for (const user of demoUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('email, role')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          results.push({
            email: user.email,
            role: user.role,
            status: 'already_exists',
            message: 'User already exists in database'
          });
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (authError) {
          results.push({
            email: user.email,
            role: user.role,
            status: 'error',
            message: `Auth creation failed: ${authError.message}`
          });
          continue;
        }

        // Insert user into users table
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: true
          })
          .select()
          .single();

        if (userError) {
          // If user table insert fails, clean up auth user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          results.push({
            email: user.email,
            role: user.role,
            status: 'error',
            message: `User table insert failed: ${userError.message}`
          });
          continue;
        }

        results.push({
          email: user.email,
          role: user.role,
          status: 'success',
          message: 'User created successfully',
          user_id: userData.id,
          auth_user_id: authData.user.id
        });

      } catch (error) {
        results.push({
          email: user.email,
          role: user.role,
          status: 'error',
          message: `Unexpected error: ${error.message}`
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user creation process completed',
        results: results,
        summary: {
          total: demoUsers.length,
          successful: results.filter(r => r.status === 'success').length,
          already_exists: results.filter(r => r.status === 'already_exists').length,
          failed: results.filter(r => r.status === 'error').length
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});