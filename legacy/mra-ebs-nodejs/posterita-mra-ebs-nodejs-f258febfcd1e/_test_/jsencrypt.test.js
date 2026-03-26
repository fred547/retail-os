const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

describe('jsencrypt', () => {

    /*
        https://travistidwell.com/jsencrypt/demo/
        generate a public key and paste it in the jsencrypt.pem file
    */

    it('should ', async () => {

        let toEncrypt = "{}";
       
        let publicKey = fs.readFileSync(path.join(__dirname, 'jsencrypt.pem'), 'utf8');
  
        var buffer = Buffer.from(toEncrypt, 'utf8');
        var encrypted = crypto.publicEncrypt({key:publicKey, padding : crypto.constants.RSA_PKCS1_PADDING}, buffer)
        var data =  encrypted.toString("base64");

        console.log(data);
       
    });

    it('should ', async () => {
        
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
        const plaintext = '{}';

        // Encrypt the text using the public key
        const encryptedBuffer = crypto.publicEncrypt(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(plaintext, 'utf-8')
        );

        // Convert the encrypted buffer to a base64-encoded string
        const encryptedText = encryptedBuffer.toString('base64');

        console.log('Encrypted Text:', encryptedText);

        
    });
    
});