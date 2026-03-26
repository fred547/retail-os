const EbsMraClient = require('../EbsMraClient');
const moment = require('moment');

const username = "Posterita";
const password = "P05t3r1t@";
const ebsMraId = "17046958415903J3TJKY213B";
const areaCode = "100";
const refreshToken = false;
const tokenRepository = {};


describe('Ebs Mra Client', () => {

    let client;

    beforeEach(async () => {

        client = new EbsMraClient(username, password, ebsMraId, areaCode, tokenRepository);
    });

    it('authenticate ', async () => {

        let response = await client.authenticate(false);
        //console.log(response);

        expect(response.status).toEqual('SUCCESS');

    });

    it('transmit invoice ', async () => {

        let response = await client.authenticate(false);
        console.log(response);

        const invoices = [{"invoiceCounter":"3","transactionType":"B2C","personType":"VATR","invoiceTypeDesc":"STD","currency":"MUR","invoiceIdentifier":"000003","invoiceRefIdentifier":"","previousNoteHash":"prevNote","reasonStated":"rgeegr","totalVatAmount":60.0,"totalAmtWoVatCur":310.0,"totalAmtWoVatMur":10,"totalAmtPaid":360,"invoiceTotal":360,"discountTotalAmount":0,"dateTimeInvoiceIssued":"20231228 18:20:35","seller":{"name":"Posterita POS","tradeName":"TEST","tan":"20351590","brn":"C07062336","businessAddr":"Coromandel","businessPhoneNo":"","ebsCounterNo":"3"},"buyer":{"name":"Test user 2","tan":"","brn":"","businessAddr":"Test address 1","buyerType":"NVTR","nic":""},"itemList":[{"itemNo":"1","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"dILAIT CONDENc 23","quantity":23214,"unitPrice":20,"discount":1.23,"discountedValue":10.1,"amtWoVatCur":60,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"2","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.0,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"3","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"4","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.0,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60},{"itemNo":"5","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.6,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60},{"itemNo":"6","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60}],"salesTransactions":"CASH"}];

        response = await client.transmitInvoice(invoices);
        console.log(response);

        expect(response.status).toEqual('SUCCESS');

    });

    it('duplicate transmission', async () => {

        await client.authenticate(false);
        
        const invoices = [{"invoiceCounter":"3","transactionType":"B2C","personType":"VATR","invoiceTypeDesc":"STD","currency":"MUR","invoiceIdentifier":"000003","invoiceRefIdentifier":"","previousNoteHash":"prevNote","reasonStated":"rgeegr","totalVatAmount":60.0,"totalAmtWoVatCur":310.0,"totalAmtWoVatMur":10,"totalAmtPaid":360,"invoiceTotal":360,"discountTotalAmount":0,"dateTimeInvoiceIssued":"20231228 18:20:35","seller":{"name":"Posterita POS","tradeName":"TEST","tan":"20351590","brn":"C07062336","businessAddr":"Coromandel","businessPhoneNo":"","ebsCounterNo":"3"},"buyer":{"name":"Test user 2","tan":"","brn":"","businessAddr":"Test address 1","buyerType":"NVTR","nic":""},"itemList":[{"itemNo":"1","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"dILAIT CONDENc 23","quantity":23214,"unitPrice":20,"discount":1.23,"discountedValue":10.1,"amtWoVatCur":60,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"2","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.0,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"3","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":10,"totalPrice":60},{"itemNo":"4","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.0,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60},{"itemNo":"5","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12.6,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60},{"itemNo":"6","taxCode":"TC01","nature":"GOODS","productCodeMra":"pdtCode","productCodeOwn":"pdtOwn","itemDesc":"2","quantity":3,"unitPrice":20,"discount":0,"discountedValue":12,"amtWoVatCur":50,"amtWoVatMur":50,"vatAmt":0,"totalPrice":60}],"salesTransactions":"CASH"}];

        const invoiceJson = JSON.stringify(invoices);
        const encryptedInvoice = await client.encrypt(client.secretKey, invoiceJson);
        const currentDate = moment().format('YYYYMMDD HH:mm:ss');

        const body = {
            requestId: client.generateUUID(),
            requestDateTime: currentDate,
            encryptedInvoice: encryptedInvoice,
        };

        const headers = {
            username: username,
            ebsMraId: ebsMraId,
            areaCode: areaCode,
            token: client.token
        };

        const url = 'https://vfisc.mra.mu/realtime/invoice/transmit';

        const response1 = await client._post(url, headers, JSON.stringify(body));
        const response2 = await client._post(url, headers, JSON.stringify(body));

        console.log(response1, response2);
    });

});