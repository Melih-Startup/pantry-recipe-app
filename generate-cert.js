const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

async function generateCertificate() {
    const certDir = path.join(__dirname, 'certs');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    // Generate self-signed certificate
    console.log('🔐 Generating SSL certificate...');

    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const options = { 
        days: 365,
        keySize: 2048,
        algorithm: 'sha256'
    };

    try {
        // Generate certificate asynchronously
        const pems = await selfsigned.generate(attrs, options);

        // Write certificate and key to files
        if (pems && pems.private && pems.cert) {
            fs.writeFileSync(keyPath, pems.private);
            fs.writeFileSync(certPath, pems.cert);
            
            console.log('✅ SSL certificate generated successfully!');
            console.log(`   Key: ${keyPath}`);
            console.log(`   Cert: ${certPath}`);
            console.log('\n⚠️  This is a self-signed certificate. Your browser will show a security warning.');
            console.log('   Click "Advanced" → "Proceed to localhost" (or similar) to continue.\n');
        } else {
            console.error('❌ Failed to generate certificate. Unexpected format from selfsigned package.');
            console.log('   PEMs object:', pems);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error generating certificate:', error.message);
        process.exit(1);
    }
}

generateCertificate();

