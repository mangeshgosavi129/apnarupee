/**
 * SignDesk DSS 2.0 Configuration
 * E-Stamp and E-Sign API settings
 */

module.exports = {
    // E-Stamp API Configuration (DSS 2.0)
    estamp: {
        baseUrl: process.env.ESTAMP_BASE_URL || 'https://in-stamp.staging-signdesk.com/api/v2/estamp',
        apiKey: process.env.ESTAMP_API_KEY || 'your-estamp-api-key',
        apiId: process.env.ESTAMP_API_ID || 'your-estamp-api-id'
    },

    // E-Sign API Configuration (2.1)
    esign: {
        baseUrl: process.env.ESIGN_BASE_URL || 'https://uat.signdesk.in/api/sandbox',
        apiKey: process.env.ESIGN_API_KEY || 'your-esign-api-key',
        apiId: process.env.ESIGN_API_ID || 'your-esign-api-id'
    },

    // First Party (Corporate - Graphsense Solutions) - Static
    firstParty: {
        name: process.env.FIRST_PARTY_NAME || 'Graphsense Solutions',
        pan: process.env.FIRST_PARTY_PAN || 'FCVPP3018M',
        email: process.env.FIRST_PARTY_EMAIL || 'info@graphsensesolutions.com',
        address: {
            street: process.env.FIRST_PARTY_ADDRESS_STREET || 'Kothrud',
            city: process.env.FIRST_PARTY_ADDRESS_CITY || 'Pune',
            state: process.env.FIRST_PARTY_ADDRESS_STATE || 'Maharashtra',
            pincode: process.env.FIRST_PARTY_ADDRESS_PINCODE || '411038'
        }
    },

    // Stamp Configuration
    stamp: {
        state: process.env.DEFAULT_STAMP_STATE || 'MH',
        type: process.env.DEFAULT_STAMP_TYPE || 'Traditional',
        documentCategory: process.env.DEFAULT_DOCUMENT_CATEGORY || '147',
        amount: parseInt(process.env.DEFAULT_STAMP_AMOUNT || '500', 10)
    }
};
