"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequest = void 0;
const getRequestConfig_1 = require("./getRequestConfig");
const encryptSecrets_1 = require("./encryptSecrets");
const buildRequest = async (unvalidatedConfig) => {
    const config = (0, getRequestConfig_1.getRequestConfig)(unvalidatedConfig);
    const request = { source: config.source };
    if (config.secrets) {
        if (!config.DONPublicKey) {
            throw Error('DONPublicKey not in config');
        }
        if (config.secretsLocation === getRequestConfig_1.Location_.Inline
            && typeof config.secrets === 'object'
            && Object.keys(config.secrets).length !== 0) {
            request.secrets = '0x' + await (0, encryptSecrets_1.encrypt)(config.walletPrivateKey, config.DONPublicKey, JSON.stringify(config.secrets));
        }
        if (config.secretsLocation === getRequestConfig_1.Location_.Offchain
            && Array.isArray(config.secretsURLs)
            && config.secretsURLs.length > 0) {
            request.secrets = '0x' + await (0, encryptSecrets_1.encrypt)(config.walletPrivateKey, config.DONPublicKey, config.secretsURLs.join(' '));
        }
    }
    if (config.args) {
        request.args = config.args;
    }
    return request;
};
exports.buildRequest = buildRequest;
