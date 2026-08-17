require('dotenv').config({ path: __dirname + '/../../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Find all users with a Base64 avatar
    const usersWithBase64 = await User.find({ avatar: { $regex: /^data:image/ } });

    console.log(`\n--- MIGRATION REPORT ---`);
    console.log(`Total users with Base64 avatars found: ${usersWithBase64.length}`);

    if (isDryRun) {
      console.log(`\n[DRY RUN] No changes will be made to the database or file system.`);
      for (const user of usersWithBase64) {
        console.log(`- User ID: ${user._id} | Name: ${user.name}`);
      }
      console.log(`\nTo run actual migration, execute without --dry-run`);
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const user of usersWithBase64) {
      console.log(`\nProcessing user: ${user._id} (${user.name})...`);
      let newImageName = null;
      try {
        const base64Data = user.avatar.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 1. Process and save WebP
        newImageName = await processAndStoreImage(buffer, 'user');
        
        // 2. Update DB
        user.avatar = newImageName;
        await user.save();
        
        console.log(`✅ Success: Updated user ${user._id} to path ${newImageName}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process user ${user._id}:`, error.message);
        failCount++;
        
        // Cleanup orphaned WebP if DB update failed but file was created
        if (newImageName) {
          console.log(`Rolling back orphaned file: ${newImageName}`);
          deleteImageSafe(newImageName);
        }
      }
    }

    console.log(`\n--- MIGRATION COMPLETE ---`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed critically:', error);
    process.exit(1);
  }
}

migrate();
