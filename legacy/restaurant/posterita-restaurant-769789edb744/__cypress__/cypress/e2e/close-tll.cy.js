describe('Till', () => {

	before(() => {
		cy.login();
	})

	it('Close till', () => {

		localStorage.setItem("#PRINTER-SETTINGS", "{\"enable\":false}");

		cy.intercept('GET', '**/till/*getTenderAmounts*').as('getTenderAmounts');

		cy.get('#menu-dropdown > a').click();
		cy.get('[data-test-id="close-till"]').click();
		cy.location().should((location) => {
			expect(location.hash).to.eq('#/close-till');
		});

		cy.wait('@getTenderAmounts').then(({ request, response }) => {

			//let body = JSON.parse(response.body);
			console.log(response);
			let body = response.body;

			expect(body).to.contain({
				"card": 0,
				"cash": 646,
				"cheque": 788,
				"coupon": 328.9,
				"deposit": 299,
				"discountTotal": 0,
				"emtelMoney": 748,
				"ext_card": 2397.1,
				"gift": 598,
				"giftsMu": 738,
				"grandTotal": 8947.10,
				"loyalty": 877,
				"mcbJuice": 768,
				"mips": 728.00,
				"mytMoney": 758,
				"noOfOrders": 20,
				"noOfReturns": 3,
				"qtyItemsReturned": 7,
				"qtyItemsSold": 32,
				"qtyReturned": 7,
				"qtyServicesReturned": 0,
				"qtyServicesSold": 0,
				"qtySold": 32,
				"subTotal": 8947.10,
				"taxTotal": 0,
				"userDiscountTotal": 0,
				"voucher": -199
			});

			expect(body.taxes).to.eql([{ "taxId": 10011756, "taxBaseAmt": 8947.10, "taxAmt": 0.00, "lineNetAmt": 8947.10 }]);

			expect(body.tenderTypes).to.eql([
				{ "name": 'Cash', "code": 'B', "amt": 646.0 },
				{ "name": 'Cheque', "code": 'S', "amt": 788.0 },
				{ "name": 'Emtel Money', "code": 'T', "amt": 748.0 },
				{ "name": 'Ext Card', "code": 'E', "amt": 2397.1 },				
				{ "name": 'Gifts.mu', "code": 'U', "amt": 738.0 },
				{ "name": 'Loyalty', "code": 'L', "amt": 877.0 },
				{ "name": 'MCB Juice', "code": 'J', "amt": 768.0 },
				{ "name": "MIPS", "code": "I", "amt": 728.0},
				{ "name": 'MY.T Money', "code": 'Y', "amt": 758.0 },
				{ "name": 'Voucher', "code": 'V', "amt": -199.0 }
				
				
			]);


			//close till
			cy.get('[data-test-id="cash-amount"]').clear().type(1000 + body['cash']);
			cy.get('[data-test-id="close-button"]').click();

			cy.get('#confirm-popup').should('be.visible').within(() => {
				cy.contains('Do you want to close till?');
				cy.get('#confirm-popup-yes-button').click();
			});


			cy.get('[data-test-id="sync-draft-and-open-orders-popup"]').should('be.visible').within(() => {
				cy.contains('1 Draft Order');
				cy.get('[data-test-id="yes-button"]').click();
			});

			cy.wait(200);

			cy.get('#confirm-popup').should('be.visible').within(() => {
				cy.contains('Do you want to print a copy of the close till?');
				cy.get('#confirm-popup-yes-button').click();
			});

			cy.get('#info-popup').should('be.visible').within(() => {
				cy.contains('You have successfully closed your till');
				cy.get('#close-info-popup-button').click();
			});


			cy.wait(200);

			cy.get('#info-popup').should('be.visible').within(() => {
				cy.contains('You have successfully clocked out all users');
				cy.get('#close-info-popup-button').click();
			});

			//login page - #/login
			cy.location().should((location) => {
				expect(location.hash).to.eq('#/login');
			});

		});

	})
});