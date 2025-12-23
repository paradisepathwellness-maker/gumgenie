# Wrangler Instructions for Developers

## Overview
This document provides instructions for setting up and deploying the project using Wrangler, Cloudflare's CLI tool for managing Workers and Pages.

---

## Prerequisites
Ensure the following are installed and configured on your system:

1. **Node.js** (latest LTS version recommended)
2. **Wrangler CLI**
   - Install via npm: `npm install -g wrangler`
3. **Cloudflare Account**
   - Ensure you have the necessary permissions to manage Workers and KV namespaces.

---

## Steps

### 1. Authenticate with Cloudflare
Run the following command to log in to your Cloudflare account:
```bash
npx wrangler login
```
This will open a browser window for OAuth authentication. Complete the login process.

### 2. Create KV Namespaces
The project requires two KV namespaces:

#### a. GG_SESSION_KV
Run:
```bash
npx wrangler kv namespace create GG_SESSION_KV
```
Add the following snippet to your Wrangler configuration file:
```json
{
  "kv_namespaces": [
    {
      "binding": "GG_SESSION_KV",
      "id": "9505602fc9c740578895efa1cd0b5e5d"
    }
  ]
}
```

#### b. GG_LICENSE_KV
Run:
```bash
npx wrangler kv namespace create GG_LICENSE_KV
```
Add the following snippet to your Wrangler configuration file:
```json
{
  "kv_namespaces": [
    {
      "binding": "GG_LICENSE_KV",
      "id": "938837901e754186b4ec2c25440499a3"
    }
  ]
}
```

### 3. Deploy the Project
Depending on your setup, deploy the project using one of the following methods:

#### a. Wrangler Pages Deploy
Run:
```bash
npx wrangler pages deploy
```

#### b. Pages Git Integration
Push your changes to the configured Git repository. Cloudflare Pages will automatically deploy the project.

---

## Post-Deployment Verification
After deployment, verify the following endpoints:

1. **Check Notion Status**:
   ```bash
   curl -X GET <BASE_URL>/api/notion/status
   ```

2. **Generate Standard Variant**:
   ```bash
   curl -X POST <BASE_URL>/api/generate -H "Content-Type: application/json" -d '{"variant": "standard"}'
   ```

3. **Generate Premium Variant**:
   ```bash
   curl -X POST <BASE_URL>/api/generate -H "Content-Type: application/json" -d '{"variant": "premium"}'
   ```

---

## Notes
- Replace `<BASE_URL>` with the actual deployed URL of your project.
- Ensure all KV namespaces are correctly configured in your Wrangler configuration file before deploying.
- If you encounter issues, refer to the Wrangler documentation: https://developers.cloudflare.com/workers/wrangler-cli

---

## Troubleshooting
### Common Issues
1. **Authentication Errors**:
   - Ensure you are logged in to the correct Cloudflare account.
2. **KV Namespace Errors**:
   - Verify the namespace IDs in your configuration file.
3. **Deployment Failures**:
   - Check the Wrangler logs for detailed error messages.

### Support
For further assistance, contact the project maintainer or refer to the Cloudflare Workers community forums.