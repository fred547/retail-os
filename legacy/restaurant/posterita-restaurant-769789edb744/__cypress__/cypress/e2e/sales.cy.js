describe('Sales', () => {

	before(() => {

		cy.login();	

		Cypress.Commands.add('goBack', (label) => {	
			
			cy.get('[data-test-id="place-order-button"]').should('exist').click();			
		});

	});

	beforeEach(() => {

		cy.placeOrder(0);

		cy.get('#search-product-textfield').type('Pizza{enter}');
		cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();
		cy.get('[data-test-id="product-search-result-product-info"]').eq(1).click();
	});

	it('Send To Kitchen', () => {

		cy.get('[data-test-id="send-to-kitchen"]').click();
		cy.location().should((location) => {
			expect(location.hash).to.eq('#/view-order');
		});


		cy.get('[data-test-id="document-no"]').invoke('text').then(x => {

			cy.get('[data-test-id="edit-button"]').click();
			cy.pin('8888');
			cy.location().should((location) => {
				expect(location.hash).to.eq('#/order-screen');
			});

			cy.get('[data-test-id="send-to-kitchen"]').click();
			cy.location().should((location) => {
				expect(location.hash).to.eq('#/view-order');
			});

			cy.get('[data-test-id="document-no"]').should('include.text', x);

			//cy.goBack();

			//clear table
			cy.clearTable('0');

		});

	});

	describe('Checkout', () => {

		before(() => {

			Cypress.Commands.add('externalPayment', (id, title) => {

				cy.get('.modal-dialog').should('be.visible').within(() => {
					cy.get(`[data-test-id="${id}"]`).click();
				});

				cy.get('[data-test-id="ext-payment-popup"]').should('be.visible').within(() => {
					cy.get('.modal-header').contains(`Payment - ${title}`);
					cy.get('[data-test-id="proceed"]').click();

				});

				cy.get('[data-test-id="tender-type"]').should('include.text', title == 'External Card' ? 'Ext Card' : title);
				cy.get('[data-test-id="pay-amt"]').should('include.text', '698.00');

				cy.goBack();
			})
		});

		beforeEach(() => {
			cy.get('#checkout-button').click();
		});

		afterEach(() => {

		});

		it('Popup', () => {

			cy.get('.modal-dialog').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Checkout');
				cy.get('.modal-header button').click();
			});

			cy.get('.modal-dialog').should('not.exist');
			//cy.get('#clear-cart-button').click(); //clear cart
			_clearCart();

		});

		it('Cash', () => {

			cy.get('.modal-dialog').should('be.visible').within(() => {
				cy.get('[data-test-id="cash"]').click();
			});

			cy.get('#cash-popup').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Payment Cash');

				cy.get('[data-test-id="total"]').should('include.text', '698.00');
				cy.get('[data-test-id="change"]').should('include.text', '-698.00');
				cy.get('[data-test-id="amount"]').should('have.value', '0');

				//exact amount
				cy.get('[data-test-id="exact-amount"]').click();
				cy.get('[data-test-id="change"]').should('include.text', '0');
				cy.get('[data-test-id="amount"]').should('have.value', '698');

				//clear
				cy.get('[data-test-id="clear"]').click();
				cy.get('[data-test-id="change"]').should('include.text', '-698.00');
				cy.get('[data-test-id="amount"]').should('have.value', '0');

				let sum = 0;

				//test denominations
				cy.get('[data-test-id="denominations"]').find('button').then($btns => {
					cy.wrap($btns).each((btn) => {
						return new Cypress.Promise((resolve) => {
							cy.get('[data-test-id="clear"]').click();
							cy.wrap(btn).click();
							let text = btn.text();
							let amt = parseFloat(text);
							sum += amt;							
							cy.get('[data-test-id="amount"]').should('have.value', amt);
							resolve();
						});
					});
				});

				cy.get('[data-test-id="amount"]').clear().type(1000);
				cy.get('[data-test-id="change"]').should('include.text', '302.00');

				cy.get('[data-test-id="proceed"]').click();

			});

			cy.get('#cash-popup').should('not.exist');

			cy.get('[data-test-id="tender-type"]').should('include.text', 'Cash');
			cy.get('[data-test-id="pay-amt"]').should('include.text', '698.00');

			cy.goBack();

		});

		it('Check', () => {

			cy.get('.modal-dialog').should('be.visible').within(() => {
				cy.get('[data-test-id="check"]').click();
			});

			cy.get('#check-popup').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Payment Check');
				cy.get('[data-test-id="total"]').should('include.text', '698.00');

				cy.get('[data-test-id="check-no"]').clear().type('1234567890');
				cy.get('[data-test-id="proceed"]').click();

			});

			cy.get('#check-popup').should('not.exist');

			cy.get('[data-test-id="tender-type"]').should('include.text', 'Cheque');
			cy.get('[data-test-id="pay-amt"]').should('include.text', '698.00');

			cy.goBack();
		});


		it('On Credit', () => {


			cy.get('[data-test-id="payment-popup"]').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Checkout');
				cy.get('[data-test-id="on-credit"]').click();
			});

			cy.get('#alert-popup').should('be.visible').within(() => {
				cy.get('.modal-body').contains('Invalid Credit Status! Reason: Credit limit not set');
			});


			cy.get('#close-alert-popup-button').click();

			//close checkout popup
			cy.get('[data-test-id="payment-popup"]').within(() => {
				cy.get('.modal-header button').click();
			});

			cy.get('.customer-search-textfield').should('be.visible').clear().type('OnCredit');
			cy.get('ul.dropdown-menu >li').eq(0).click();

			cy.get('#checkout-button').click();

			cy.get('[data-test-id="on-credit"]').click();

			cy.get('[data-test-id="delivery-popup"]').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Payment On Credit');
				cy.get('[data-test-id="payment-term"]').select('Immediate');
				cy.get('[data-test-id="proceed"]').click();

			});

			cy.get('[data-test-id="delivery-popup"]').should('not.exist');

			cy.goBack();
		});

		it('External Payment Popup', () => {

			cy.get('.modal-dialog').should('be.visible').within(() => {
				cy.get('[data-test-id="ext-card"]').click();
			});

			cy.get('[data-test-id="ext-payment-popup"]').should('be.visible').within(() => {
				cy.get('[data-test-id="no"]').click();

			});

			cy.get('[data-test-id="ext-payment-popup"]').should('not.exist');

			cy.location().should((location) => {
				expect(location.hash).to.eq('#/order-screen');
			});

			//close checkout dialog
			cy.get('[data-test-id="payment-popup"]').within(() => {
				cy.get('.modal-header button').click();
			});

			//cy.get('#clear-cart-button').click(); //clear cart
			_clearCart();

		});

		it('Ext-card', () => {
			cy.externalPayment("ext-card", "External Card");
		});

		it('MCB Juice', () => {
			cy.externalPayment("mcb-juice", "MCB Juice");
		});

		it('Myt Money', () => {
			cy.externalPayment("myt-money", "MY.T Money");;
		});

		it('Blink', () => {
			cy.externalPayment("emtel-money", "Blink");
		});

		it('Gifts.mu', () => {
			cy.externalPayment("gifts-mu", "Gifts.mu");
		});

		it('MIPS', () => {
			cy.externalPayment("mips", "MIPS");
		});

		it('Voucher', () => {

			cy.get('.modal-dialog').should('be.visible').within(() => {
				cy.get('[data-test-id="voucher"]').click();
			});

			cy.get('[data-test-id="voucher-popup"]').should('be.visible').within(() => {
				cy.get('.modal-header').contains('Payment Voucher');

				cy.get('[data-test-id="store"]').select("Dummy1 HQ");
				cy.get('[data-test-id="voucher-no"]').clear().type("XXXXXX");
				cy.get('[data-test-id="proceed"]').click();
			});

			cy.get('#alert-popup').should('be.visible').within(() => {
				cy.get('.modal-body').contains('Invalid voucher number!');
				cy.get('#close-alert-popup-button').click();
			});

			//close popups
			cy.get('[data-test-id="voucher-popup"]').within(() => {
				cy.get('.modal-header button').click();
			});

			//close checkout popup
			cy.get('[data-test-id="payment-popup"]').within(() => {
				cy.get('.modal-header button').click();
			});


			cy.getVoucherNo(3).then( $voucherNo => { 
				
				cy.get('#menu-dropdown > a').click();
				cy.get('[data-test-id="sale"]').click();

				cy.get('#checkout-button').click();
				cy.get('[data-test-id="payment-popup"]').within(() => {
					cy.get('[data-test-id="voucher"]').click();
				});

				cy.get('[data-test-id="voucher-popup"]').within(() => {
					cy.get('[data-test-id="store"]').select("Dummy1 HQ");
					cy.get('[data-test-id="voucher-no"]').clear().type($voucherNo);
					cy.get('[data-test-id="proceed"]').click();
				});

				cy.get('[data-test-id="voucher-popup"]').should('not.be.exist');
	
				cy.get('[data-test-id="tender-type"]').should('include.text', 'Voucher');
				cy.get('[data-test-id="pay-amt"]').should('include.text', '698.00');
	
				cy.goBack();
			});			

		});

		it('Loyalty', () => {

			cy.get('[data-test-id="payment-popup"]').within(() => {
				cy.get('.modal-header button').click();
			})

			cy.get('.customer-search-textfield').clear().type('Test Loyalty');
			cy.get('ul.dropdown-menu >li').eq(0).click();
			cy.get('#checkout-button').click();

			cy.get('[data-test-id="payment-popup"]').within(() => {
				cy.get('[data-test-id="loyalty"]').click();
			});

			cy.get('[data-test-id="loyalty-popup"]').within(() => {
				cy.get('[data-test-id="proceed"]').click();
			});

			cy.get('[data-test-id="loyalty-popup"]').should('not.exist');

			cy.get('[data-test-id="tender-type"]').should('include.text', 'Loyalty');
			cy.get('[data-test-id="pay-amt"]').should('include.text', '698.00');

			cy.goBack();
		});

	});


});

let _clearCart = function(){
    cy.get('#clear-cart-button').should('exist').then(
        e => e.click()
    );

    cy.get('#confirm-popup').should('be.visible').within(() => {
        cy.contains('Do you want to clear order?');
        cy.get('#confirm-popup-yes-button').click();
    });
};