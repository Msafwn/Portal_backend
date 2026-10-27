import User from '../models/User.js';

/**
 * Ensures a fixed System Administrator account exists in MongoDB.
 * Default Fixed Credentials:
 * Email: admin@gmail.com
 * Password: Admin@12345
 */
export const ensureAdminExists = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    let admin = await User.findOne({ email: adminEmail.toLowerCase().trim() });

    if (!admin) {
      admin = await User.create({
        name: 'System Administrator',
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
        role: 'admin',
        department: 'Administration & Operations',
        phone: '+92 300 0000000',
        location: 'Islamabad, Pakistan',
        headline: 'Lead System Auditor & Platform Administrator',
        bio: 'Super Administrator overseeing AI matchmaking accuracy, platform analytics, security audit trails, and user permissions.',
        skills: [
          { name: 'system administration', proficiency: 'Expert' },
          { name: 'audit logging', proficiency: 'Expert' },
          { name: 'ai pipeline monitoring', proficiency: 'Expert' },
        ],
        profileCompleted: true,
      });

      console.log(`
👑 [Admin Initialized]
📧 Fixed Admin Email:    ${adminEmail}
🔑 Fixed Admin Password: ${adminPassword}
🛡️ Role:                 admin
==================================================`);
    } else {
      // If admin already exists but role is not admin, upgrade it
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        await admin.save({ validateBeforeSave: false });
      }
      console.log(`👑 [Admin Verified]: ${adminEmail} (Role: admin)`);
    }
  } catch (error) {
    console.error(`⚠️ Error verifying admin account: ${error.message}`);
  }
};

export default ensureAdminExists;
