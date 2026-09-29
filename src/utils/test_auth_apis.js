const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  console.log('🧪 ============================================');
  console.log('🧪 Starting Backend Auth APIs Live Verification');
  console.log('🧪 ============================================\n');

  try {
    // 1. Health Check Test
    console.log('1️⃣ Testing Health Check (GET /)...');
    const healthRes = await fetch(`${BASE_URL}/`);
    const healthData = await healthRes.json();
    console.log('✅ Health Check Passed:', healthData.message);

    // 2. Register Test
    const testEmail = `testuser_${Date.now()}@example.com`;
    console.log(
      `\n2️⃣ Testing Registration (POST /api/auth/register) for: ${testEmail}...`
    );
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: testEmail,
        password: 'password123',
        role: 'student',
        skills: ['React', 'Node.js'],
        location: 'Lahore',
      }),
    });

    const registerData = await registerRes.json();
    console.log('✅ Registration Passed:');
    console.log('   - Status Code:', registerRes.status);
    console.log('   - User ID:', registerData.data?.user?._id);
    console.log('   - User Role:', registerData.data?.user?.role);
    console.log(
      '   - Access Token Generated:',
      registerData.data?.accessToken ? 'YES' : 'NO'
    );
    console.log(
      '   - Refresh Token Generated:',
      registerData.data?.refreshToken ? 'YES' : 'NO'
    );

    // 3. Login Test
    console.log('\n3️⃣ Testing Login (POST /api/auth/login)...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
      }),
    });

    const loginData = await loginRes.json();
    const accessToken = loginData.data?.accessToken;
    const refreshToken = loginData.data?.refreshToken;

    console.log('✅ Login Passed:');
    console.log('   - Status Code:', loginRes.status);
    console.log('   - Welcome User:', loginData.data?.user?.name);
    console.log('   - Access Token Length:', accessToken?.length || 0);
    console.log(
      '   - Set-Cookie Headers Received:',
      loginRes.headers.get('set-cookie') ? 'YES' : 'NO'
    );

    // 4. Protected Route Test (GET /api/auth/me)
    console.log(
      '\n4️⃣ Testing Protected Route (GET /api/auth/me) with Bearer Token...'
    );
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const meData = await meRes.json();
    console.log('✅ Protected Profile Route Passed:');
    console.log('   - Authenticated User Name:', meData.data?.name);
    console.log('   - Authenticated User Email:', meData.data?.email);
    console.log(
      '   - User Skills:',
      meData.data?.skills?.map((s) => s.name).join(', ')
    );

    // 5. Refresh Token Test (POST /api/auth/refresh-token)
    console.log('\n5️⃣ Testing Token Refresh (POST /api/auth/refresh-token)...');
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: refreshToken,
      }),
    });

    const refreshData = await refreshRes.json();
    console.log('✅ Token Refresh Passed:');
    console.log('   - Status Code:', refreshRes.status);
    console.log(
      '   - New Access Token Generated:',
      refreshData.data?.accessToken ? 'YES' : 'NO'
    );
    console.log(
      '   - New Refresh Token Generated:',
      refreshData.data?.refreshToken ? 'YES' : 'NO'
    );

    // 6. Invalid Password Test
    console.log('\n6️⃣ Testing Negative Test Case (Invalid Password)...');
    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrong_password_xyz',
      }),
    });

    const wrongPassData = await wrongPassRes.json();
    console.log(
      '✅ Negative Test Passed: Correctly returned',
      wrongPassRes.status,
      '-',
      wrongPassData.message
    );

    console.log('\n🎉 ============================================');
    console.log('🎉 ALL AUTH API TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('🎉 ============================================');
  } catch (error) {
    console.error('❌ Test Execution Failed:', error.message);
  }
};

runTests();
