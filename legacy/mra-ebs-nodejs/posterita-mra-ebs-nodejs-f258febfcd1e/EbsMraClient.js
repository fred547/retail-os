const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const util = require('util');
const path = require('path');
const moment = require('moment');

const readFile = util.promisify(fs.readFile);

module.exports = class EbsMraClient {
    constructor(username, password, ebsMraId, areaCode, tokenRepository) {
        this.username = username;
        this.password = password;
        this.ebsMraId = ebsMraId;
        this.areaCode = areaCode;
        this.tokenRepository = tokenRepository;
        this.token = '';
        this.tokenExpiryDate = '';
        this.secretKey = '';
    }

    async setTokenInfo(token, tokenExpiryDate, secretKey) {
        this.token = token;
        this.tokenExpiryDate = tokenExpiryDate;
        this.secretKey = secretKey;
    }

    async authenticate(refreshToken) {
        const encryptKey = this.generateRandomAESkey();

        const payloadInput = {
            username: this.username,
            password: this.password,
            encryptKey: encryptKey,
            refreshToken: refreshToken ? 'true' : 'false',
        };

        const payload = this.encryptUsingMraRSACertificate(JSON.stringify(payloadInput));

        
        const body = {
            requestId: this.generateUUID(),
            payload: payload,
        };
        
        
        const headers = {
            username: this.username,
            ebsMraId: this.ebsMraId,
            areaCode: this.areaCode,
        };

        const url = 'https://vfisc.mra.mu/einvoice-token-service/token-api/generate-token';

        const response = await this._post(url, headers, JSON.stringify(body));
        const tokenResponse = JSON.parse(response);

        console.log(tokenResponse);

        if (tokenResponse.status === 'SUCCESS') {
            const encryptedSecretKey = tokenResponse.key;
            const decryptedSecretKey = this.decryptTokenKey(encryptKey, encryptedSecretKey);
            tokenResponse.key = decryptedSecretKey;

            await this.setTokenInfo(tokenResponse.token, tokenResponse.expiryDate, tokenResponse.key);

            /*
            if (this.tokenRepository) {
                this.tokenRepository.setToken(this.token);
                this.tokenRepository.setTokenExpiryDate(this.tokenExpiryDate);
                this.tokenRepository.setSecretKey(this.secretKey);
                this.tokenRepository.save();
            }
            */
        }

        return tokenResponse;
    }

    encryptUsingMraRSACertificate(message) {

        // Your RSA public key in PEM format
        const publicKeyPEM = `
        -----BEGIN PUBLIC KEY-----
        MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmq7EwCHjHpOdivEgmx9o
        w/OH5iF40h6IV2VPxkoFXxAZ8JNlr2V3iX5ETEllOL3QyZbEw4tJbg4OaAKwlq2Z
        XYlaX6XoFw4/nWjVc4+Hd0D/x4CNNkP/u8ikSFeNqK1F28lQ16qrpC1vybxqc8Bw
        +A+Cm51f94YzMXjIkKO2G9PE/pMrSnD3WVisrvOTF8GgP3QbZKZGl7p2DEWKnsC3
        SQWxSu0HCP5kPtY8QkvheCDEqho/tEHLfVdzIFyhM4fYgEw318Xox6xeSefXrUpX
        kWQZCGrdjT0OZ9O5ok6YFatc99x/LI3OOAl2yQnpjNSM2Q/yMIgdljWWhtjWqkqE
        K1B65SHKw0XM/vp67Vb4y7K4dTWfHyBr3fg5C60OB3sSP5Pq6UrtrIewugA9V5G4
        UMCg/a3ITSIF0F7jla0AuF6Tx844qh0SAHm0m583QDVezbJ2k7dYbJcyxffecot0
        SnFaEolC1DycVkC8TuXr8fRqbKGHN85PR33bqWu5vou/OkYqp+XC6GH6+l2z0yg2
        bkMGr7IjfuYf+2EeSsBaHhs0lgdNHQQUiqFOArtlVpo4Wkq4rQilHDj+U+uT5Cjr
        ABW89gpKmFkvJklpLBCjoumDsBZFdaKsCPLE2y+QoHWsXdbM6kHMILqdsXzse9+x
        YuCV3Yvw1wtw8jam5lCVztMCAwEAAQ==
        -----END PUBLIC KEY-----`;

        // Convert the public key from PEM format to DER format
        const publicKeyDER = Buffer.from(publicKeyPEM
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\n/g, ''), 'base64');

        // Create a crypto public key object
        const publicKey = crypto.createPublicKey({
        key: publicKeyDER,
        format: 'der',
        type: 'spki'
        });

        // Text to be encrypted
        const plaintext = message;

        // Encrypt the text using the public key
        const encryptedBuffer = crypto.publicEncrypt(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(plaintext, 'utf-8')
        );

        // Convert the encrypted buffer to a base64-encoded string
        const encryptedText = encryptedBuffer.toString('base64');

        return encryptedText;
    }

    generateRandomAESkey() {
        const key = crypto.randomBytes(32); // 256 bits
        return this.encodeToBase64(key);
    }

    decryptTokenKey(secretKey, encryptedTokenKey) {
        const keyBuffer = this.decodeFromBase64(secretKey);
        const cipher = crypto.createDecipheriv('aes-256-ecb', keyBuffer, Buffer.alloc(0));
        const decryptedBuffer = Buffer.concat([cipher.update(encryptedTokenKey, 'base64'), cipher.final()]);
        return decryptedBuffer.toString('utf8');
    }

    encrypt(base64EncodedSecretKey, data) {
        // Decode the Base64-encoded data to obtain the AES key
        const aesKeyBuffer = this.decodeFromBase64(base64EncodedSecretKey);
        const aesKey = crypto.createCipheriv('aes-256-ecb', aesKeyBuffer, null);

        // Encrypt the input data using the AES key
        let encryptedData = aesKey.update(data, 'utf-8', 'base64');
        return encryptedData += aesKey.final('base64');
    }

    async transmitInvoice(invoices) {
        const invoiceJson = JSON.stringify(invoices);
        const encryptedInvoice = await this.encrypt(this.secretKey, invoiceJson);
        const currentDate = moment().format('YYYYMMDD HH:mm:ss');

        const body = {
            requestId: this.generateUUID(),
            requestDateTime: currentDate,
            encryptedInvoice: encryptedInvoice,
        };

        const headers = {
            username: this.username,
            ebsMraId: this.ebsMraId,
            areaCode: this.areaCode,
            token: this.token,
        };

        const url = 'https://vfisc.mra.mu/realtime/invoice/transmit';

        const response = await this._post(url, headers, JSON.stringify(body));
        return JSON.parse(response);
    }

    // ... Other methods

    async _post(url, headers, requestBody) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            };

            const req = https.request(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(requestBody);
            req.end();
        });
    }

    encodeToBase64(input) {
        return Buffer.from(input).toString('base64');
    }

    decodeFromBase64(input) {
        return Buffer.from(input, 'base64');
    }

    generateUUID() {
        return crypto.randomUUID();
    }
}