/**
 * Test PAN-Aadhaar Link Check
 * Usage: node test-pan-aadhaar-link.js
 */
const SandboxApi = require('./services/sandboxApi');

async function testPanAadhaarLink() {
    const sandboxApi = new SandboxApi();

    const pan = 'FCVPP3058M';
    const aadhaar = '207447168063';

    console.log('\n=== Testing PAN-Aadhaar Link Check ===');
    console.log(`PAN: ${pan}`);
    console.log(`Aadhaar: ${aadhaar.slice(0, 4)}****${aadhaar.slice(-4)}`);
    console.log('');

    try {
        const result = await sandboxApi.checkPanAadhaarLink(pan, aadhaar);

        console.log('\n✅ SUCCESS - Response:');
        console.log(JSON.stringify(result, null, 2));

        if (result.data) {
            console.log('\n--- Summary ---');
            console.log(`Seeding Status: ${result.data.aadhaar_seeding_status}`);
            console.log(`Message: ${result.data.message}`);
            console.log(`Linked: ${result.data.aadhaar_seeding_status === 'y' ? 'YES' : 'NO'}`);
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

testPanAadhaarLink();
