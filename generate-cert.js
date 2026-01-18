const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔐 Generating SSL certificate for HTTPS...\n');

// Get local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIPAddress();
console.log(`Using IP address: ${localIP}\n`);

// Create certs directory if it doesn't exist
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Generate self-signed certificate
(async function() {
try {
    const attrs = [{ name: 'commonName', value: localIP }];
    const pems = await selfsigned.generate(attrs, {
        keySize: 2048,
        days: 365,
        algorithm: 'sha256',
        extensions: [
            {
                name: 'basicConstraints',
                cA: true
            },
            {
                name: 'keyUsage',
                keyCertSign: true,
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
                dataEncipherment: true
            },
            {
                name: 'subjectAltName',
                altNames: [
                    {
                        type: 2, // DNS
                        value: 'localhost'
                    },
                    {
                        type: 7, // IP
                        ip: '127.0.0.1'
                    },
                    {
                        type: 7, // IP
                        ip: localIP
                    }
                ]
            }
        ]
    });

    // Write certificate and key to files
    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);

    console.log('✅ Certificate generated successfully!\n');
    console.log('You can now start the server and access it via HTTPS.');
    console.log(`HTTPS URL: https://${localIP}:3443\n`);
} catch (error) {
    console.error('❌ Failed to generate certificate:', error.message);
    process.exit(1);
}
})();

