const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Chat = require('./src/models/Chat');
const Booking = require('./src/models/Booking');
const Salon = require('./src/models/Salon');

async function migrateChats() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const chats = await Chat.find({ salon: { $exists: false } });
    console.log(`Found ${chats.length} chats without a salonId.`);

    let backfilledCount = 0;
    let generalCount = 0;
    let unableToMapCount = 0;

    for (let chat of chats) {
      if (chat.chatType === 'user-admin') {
        chat.conversationType = 'general';
        await chat.save();
        generalCount++;
        continue;
      }

      const userParticipant = chat.participants.find(p => p.role === 'user');
      const vendorParticipant = chat.participants.find(p => p.role === 'vendor');

      if (userParticipant && vendorParticipant) {
        const bookings = await Booking.find({ user: userParticipant.userId }).populate('salon');
        const matchingBookings = bookings.filter(b => b.salon && b.salon.vendor.toString() === vendorParticipant.userId.toString());

        if (matchingBookings.length > 0) {
          const uniqueSalons = [...new Set(matchingBookings.map(b => b.salon._id.toString()))];
          if (uniqueSalons.length === 1) {
            chat.salon = uniqueSalons[0];
            chat.conversationType = 'salon';
            await chat.save();
            backfilledCount++;
          } else {
            chat.conversationType = 'general';
            await chat.save();
            unableToMapCount++;
          }
        } else {
          chat.conversationType = 'general';
          await chat.save();
          generalCount++;
        }
      } else {
        chat.conversationType = 'general';
        await chat.save();
        generalCount++;
      }
    }

    console.log('\n--- Migration Results ---');
    console.log(`Total chats processed: ${chats.length}`);
    console.log(`Successfully backfilled with salonId: ${backfilledCount}`);
    console.log(`Kept as general chat: ${generalCount}`);
    console.log(`Unable to map safely: ${unableToMapCount}`);
    console.log('-------------------------\n');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrateChats();
