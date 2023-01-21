"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Log_1 = require("./Log");
const axios_1 = __importDefault(require("axios"));
const NODE_ADDRESS = process.env['NODE_ADDRESS'];
if (!NODE_ADDRESS) {
    throw Error('The NODE_ADDRESS environment variable must be set');
}
const MAX_URL_SOURCES = parseInt(process.env['MAX_URL_SOURCES'] ?? '5');
const MAX_URL_LENGTH = parseInt(process.env['MAX_URL_LENGTH'] ?? '2048');
const MAX_RESPONSE_BYTES = parseInt(process.env['MAX_RESPONSE_BYTES'] ?? '1000000');
const RESPONSE_TIMEOUT = parseInt(process.env['RESPONSE_TIMEOUT'] ?? '3000');
const handler = async (event, _) => {
    if (!isValidInput(event)) {
        throw Error('Input is invalid');
    }
    // split on spaces as spaces are not valid characters in a URL (commas can be)
    let sources = event.sources.split(' ');
    const invalidSources = sources.filter(s => s.slice(0, 8) !== 'https://' && s.slice(0, 7) !== 'http://');
    if (invalidSources.length > 0) {
        // Don't log the invalid sources as it may contain sensitive info
        Log_1.Log.warn(`${invalidSources.length} invalid secrets sources`, event.requestId);
    }
    // Get HTTP URLs
    sources = sources.filter(s => s.slice(0, 8) === 'https://' || s.slice(0, 7) === 'http://').slice(0, MAX_URL_SOURCES); // Only accept up to MAX_URL_SOURCES URLs
    if (sources.length === 0) {
        return {
            statusCode: 406,
            body: JSON.stringify({
                userError: 'No valid secrets URLs'
            })
        };
    }
    // Attempt to fetch & validate off-chain secrets
    for (let i = 0; i < sources.length; i++) {
        const url = sources[i];
        if (url?.length > MAX_URL_LENGTH) {
            return {
                statusCode: 406,
                body: JSON.stringify({
                    userError: `secrets URL length >${MAX_URL_LENGTH}`
                })
            };
        }
        try {
            const httpResponse = await (0, axios_1.default)({
                url,
                timeout: RESPONSE_TIMEOUT,
                responseType: 'json',
                maxContentLength: MAX_RESPONSE_BYTES,
            });
            const encryptedSecrets = getAssignedEncryptedSecrets(httpResponse.data);
            return {
                statusCode: 200,
                body: JSON.stringify(encryptedSecrets)
            };
        }
        catch (error) {
            // Don't log the URL as it may contain sensitive info
            Log_1.Log.warn(`Failed to fetch valid secrets from URL #${i}: ${error}`, event.requestId);
        }
    }
    return {
        statusCode: 406,
        body: JSON.stringify({
            userError: 'Failed to fetch valid secrets'
        })
    };
};
exports.handler = handler;
const isValidInput = (event) => {
    if (!event) {
        return false;
    }
    const input = event;
    return typeof input?.sources === 'string' &&
        (!input.requestId || typeof input.requestId === 'string');
};
const getAssignedEncryptedSecrets = (httpBody, requestId) => {
    if (typeof httpBody !== 'object') {
        throw Error('Fetched secrets are not a valid JSON object');
    }
    const fetchedSecrets = httpBody;
    if (typeof fetchedSecrets[NODE_ADDRESS] === 'string') {
        Log_1.Log.debug('Using node-assigned encrypted secrets', requestId);
        return {
            assignedEncryptedSecrets: fetchedSecrets[NODE_ADDRESS]
        };
    }
    if (typeof fetchedSecrets['0x0'] === 'string') {
        Log_1.Log.debug('Using default DON-wide encrypted secrets', requestId);
        return {
            donEncryptedSecrets: fetchedSecrets['0x0']
        };
    }
    throw Error('Fetched encrypted secrets are invalid');
};
