const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const AirdropExternalSource = require('../src/modules/airdrops/external/airdropExternal.model');

async function main() {
  await connectDB();
  const result = await AirdropExternalSource.deleteMany({});

  console.log(
    JSON.stringify(
      {
        success: true,
        airdropsDeleted: result.deletedCount || 0,
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
