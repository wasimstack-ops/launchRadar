const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { clearAllEvents } = require('../src/modules/events/events.service');
const { clearAllTechEvents } = require('../src/modules/tech-events/tech-event.service');

async function main() {
  await connectDB();

  const [cryptoDeleted, techDeleted] = await Promise.all([
    clearAllEvents(),
    clearAllTechEvents(),
  ]);

  console.log(
    JSON.stringify(
      {
        success: true,
        cryptoEventsDeleted: cryptoDeleted,
        techEventsDeleted: techDeleted,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          success: false,
          message: error?.message || String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
