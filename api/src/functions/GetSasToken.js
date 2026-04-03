const { app } = require('@azure/functions');
const {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");

app.http('GetSasToken', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const blobName = request.query.get('blobName');
    if (!blobName) {
      return { status: 400, body: "blobName required" };
    }

    const account   = process.env.STORAGE_ACCOUNT;
    const key       = process.env.STORAGE_KEY;
    const container = process.env.STORAGE_CONTAINER;

    console.log("scr-functions-GetSasToken");

    if (!account || !key || !container) {
      return { status: 500, body: "Storage not configured" };
    }

    const cred = new StorageSharedKeyCredential(account, key);

    // Upload SAS (PUT) — 15 min
    const uploadSas = generateBlobSASQueryParameters({
      containerName: container, blobName,
      permissions: BlobSASPermissions.parse("rcw"),
      expiresOn: new Date(Date.now() + 15 * 60 * 1000),
    }, cred).toString();

    // Read SAS (GET) — 24 hr
    const readSas = generateBlobSASQueryParameters({
      containerName: container, blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }, cred).toString();

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl: `https://${account}.blob.core.windows.net/${container}/${blobName}?${uploadSas}`,
        readUrl:   `https://${account}.blob.core.windows.net/${container}/${blobName}?${readSas}`,
      })
    };
  }
});
