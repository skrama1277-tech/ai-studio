const { app } = require('@azure/functions');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

app.http('GetUseCases', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async () => {
    const account   = process.env.STORAGE_ACCOUNT;
    const key       = process.env.STORAGE_KEY;
    const container = process.env.STORAGE_CONTAINER;

    if (!account || !key || !container) {
      return { status: 500, body: "Storage not configured" };
    }

    try {
      const cred   = new StorageSharedKeyCredential(account, key);
      const client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
      const blob   = client.getContainerClient(container).getBlockBlobClient('data.json');

      const download = await blob.download(0);
      const chunks = [];
      for await (const chunk of download.readableStreamBody) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString('utf8');

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: text
      };
    } catch (err) {
      if (err.statusCode === 404) {
        return { status: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ucs":[]}' };
      }
      return { status: 500, body: `Error reading data: ${err.message}` };
    }
  }
});
