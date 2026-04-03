const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const { blobName } = req.query;
  if (!blobName) { context.res = { status: 400, body: "blobName required" }; return; }

  const account   = process.env.STORAGE_ACCOUNT;
  const key       = process.env.STORAGE_KEY;
  const container = process.env.STORAGE_CONTAINER;
  const cred      = new StorageSharedKeyCredential(account, key);

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

  context.res = {
    status: 200,
    body: {
      uploadUrl: `https://${account}.blob.core.windows.net/${container}/${blobName}?${uploadSas}`,
      readUrl:   `https://${account}.blob.core.windows.net/${container}/${blobName}?${readSas}`,
    }
  };
};