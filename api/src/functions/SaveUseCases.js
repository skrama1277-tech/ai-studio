const { app } = require('@azure/functions');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

app.http('SaveUseCases', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const account   = process.env.STORAGE_ACCOUNT;
    const key       = process.env.STORAGE_KEY;
    const container = process.env.STORAGE_CONTAINER;

    if (!account || !key || !container) {
      return { status: 500, body: "Storage not configured" };
    }

    try {
      const body = await request.text();
      const parsed = JSON.parse(body); // validate JSON before saving
      const formatted = JSON.stringify(parsed, null, 2);

      const cred   = new StorageSharedKeyCredential(account, key);
      const client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
      const blob   = client.getContainerClient(container).getBlockBlobClient('data.json');

      await blob.upload(formatted, Buffer.byteLength(formatted), {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      return { status: 200, body: 'OK' };
    } catch (err) {
      return { status: 500, body: `Error saving data: ${err.message}` };
    }
  }
});
