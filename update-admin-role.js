const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - using the correct URL and service role key
const supabaseUrl = 'https://ysubkmcyeqosjybogvyq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWJrbWN5ZXFvc2p5Ym9ndnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODMyOTk0NiwiZXhwIjoyMDczOTA1OTQ2fQ.yfRwgv18r4qUeMSC-VtAGYOboYz-loIBYFV6tDshSD8';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserToAdmin() {
  const userId = 'ffa5c28d-a1d3-4f1c-91aa-16010e1f70e4';
  
  try {
    console.log('Checking current user status...');
    
    // First, check if the user exists
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', userId);
    
    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return;
    }
    
    if (!currentUser || currentUser.length === 0) {
      console.log('User not found in profiles table. Creating profile...');
      
      // Create the profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          role: 'admin',
          email: 'blessing@ft.com' // Updated with the correct email
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return;
      }
      
      console.log('Successfully created admin profile:', newProfile);
      return;
    }
    
    console.log('Current user status:', currentUser[0]);
    
    // Update the user role to admin
    console.log('Updating user role to admin...');
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user role:', updateError);
      return;
    }
    
    console.log('Successfully updated user to admin:', updatedUser);
    
    // Verify the update
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', userId)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('Verified user status:', verifyUser);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
updateUserToAdmin();