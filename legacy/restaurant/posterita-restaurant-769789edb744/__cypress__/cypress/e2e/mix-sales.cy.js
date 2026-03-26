describe('Mix Sales', () => {

    before(() => {
        cy.login();

        cy.placeOrder(0);

        cy.get('#search-product-textfield').type('Pizza{enter}');
        cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();
        cy.get('[data-test-id="product-search-result-product-info"]').eq(1).click();
        cy.get('[data-test-id="product-search-result-product-info"]').eq(2).click();
        cy.get('[data-test-id="product-search-result-product-info"]').eq(3).click();

        cy.get('.customer-search-textfield').should('be.visible').clear().type('Test Loyalty');
        cy.get('ul.dropdown-menu >li').eq(0).click();
    });

    it('Choose Mix', () => {

        cy.get('#checkout-button').click();

        cy.get('.modal-dialog').should('be.visible').within(() => {
            cy.get('[data-test-id="mix"]').click();
        });

        cy.get('#confirm-popup').should('be.visible').within(() => {
            cy.contains('Do you want to proceed with Mix Payment?');
            cy.get('#confirm-popup-yes-button').click();

        });

        cy.get('[data-test-id="delivery-popup"]').should('be.visible').within(() => {
            cy.get('[data-test-id="deliver-now"]').click();
            cy.get('[data-test-id="proceed"]').click();
        });

        cy.location().should((location) => {
            expect(location.hash).to.eq('#/view-order');
        });

        cy.get('[data-test-id="open-amt"]').should('be.visible').and('include.text', '1,596.00');

    });

    it('Popup', () => {

        cy.get('#menu-dropdown > a').click();
        cy.get('#confirm-popup').should('be.visible').within(() => {
            cy.contains('You have not paid this order. Do you want to leave page?');
            cy.get('#confirm-popup-no-button').click();

        });


        cy.get('[data-test-id="pay-button"]').click();

        cy.get('.modal-dialog').should('be.visible').within(() => {
            cy.get('.modal-header').contains('Pay');
            cy.get('.modal-header button').click();
        });

        cy.get('.modal-dialog').should('not.exist');

    });

    describe('Payments', () => {

        let openAmt = 1596;

        before(() => {
            cy.get('[data-test-id="pay-button"]').click();

            Cypress.Commands.add('externalPayment', (id, title, amount) => {

                let expectedOpenAmt = new Intl.NumberFormat().format(openAmt);

                cy.get(id).click();
                cy.get('[data-test-id="external-payment-popup"]').should('be.visible').within(() => {
                    cy.get('.modal-header').contains(`Payment - ${title}`);
                    cy.get('[data-test-id="open-amt"]').should('include.text', expectedOpenAmt);
                    cy.get('[data-test-id="amount"]').clear().type(amount);
                    cy.get('[data-test-id="proceed"]').click();
                });

                cy.get('#external-payment-confirmation-popup').should('be.visible').within(() => {
                    cy.get('.modal-header').contains(`Payment Confirmation - ${title}`);
                    cy.get('.modal-body').contains(`Has the ${title} payment gone through?`);
                    cy.get('[data-test-id="proceed"]').click();
                });

                openAmt = openAmt - amount;

            });
        });



        it('Cash', () => {

            let expectedOpenAmt = new Intl.NumberFormat().format(openAmt);

            cy.get('[data-test-id="cash"]').click();
            cy.get('[data-test-id="cash-popup"]').should('be.visible').within(() => {
                cy.get('.modal-header').contains('Payment Cash');
                cy.get('[data-test-id="open-amt"]').should('include.text', expectedOpenAmt);
                cy.get('[data-test-id="change-amount"]').should('include.text', '0.00');

                //full payment
                let amtTendered = 2000;
                cy.get('[data-test-id="amount"]').clear().type(`${amtTendered}`);

                let changeAmt = amtTendered - openAmt;
                cy.get('[data-test-id="amount-paid"]').should('have.value', `${openAmt}`);
                cy.get('[data-test-id="change-amount"]').should('include.text', `${changeAmt}`);

                //partial payment
                cy.get('[data-test-id="amount"]').clear().type('100');
                cy.get('[data-test-id="amount-paid"]').should('have.value', '100');
                cy.get('[data-test-id="change-amount"]').should('include.text', '0.00');

                cy.get('[data-test-id="proceed"]').click();

                openAmt = openAmt - 100;
            });

            cy.get('#info-popup').should('be.visible').within(() => {
                cy.get('.modal-body').contains('Change: 0.00');
                cy.get('#close-info-popup-button').click();
            });

        });

        it('Check', () => {

            let expectedOpenAmt = new Intl.NumberFormat().format(openAmt);

            cy.get('[data-test-id="check"]').click();
            cy.get('[data-test-id="check-popup"]').should('be.visible').within(() => {
                cy.get('.modal-header').contains('Payment Check');
                cy.get('[data-test-id="open-amt"]').should('include.text', expectedOpenAmt);

                cy.get('[data-test-id="amount"]').clear().type('90');
                cy.get('[data-test-id="check-no"]').clear().type('123456789');

                cy.get('[data-test-id="proceed"]').click();

                openAmt = openAmt - 90;
            });
        });

        it('ExtCard', () => {

            let title = "External Card";
            let id = '[data-test-id="ext-card"]';
            let amount = 80;

            cy.externalPayment(id, title, amount);
        });

        it('MCB Juice', () => {

            let title = "MCB Juice";
            let id = '[data-test-id="mcb-juice"]';
            let amount = 70;
            
            cy.externalPayment(id, title, amount);
        });

        it('Myt Money', () => {

            let title = "MY.T Money";
            let id = '[data-test-id="myt-money"]';
            let amount = 60;

            cy.externalPayment(id, title, amount);
        });

        it('Blink', () => {

            let title = "Blink";
            let id = '[data-test-id="emtel-money"]';
            let amount = 50;

            cy.externalPayment(id, title, amount);

        });

        it('Gifts.mu', () => {

            let title = "Gifts.mu";
            let id = '[data-test-id="gifts-mu"]';
            let amount = 40;

            cy.externalPayment(id, title, amount);

        });

        it('MIPS', () => {

            let title = "MIPS";
            let id = '[data-test-id="mips"]';
            let amount = 30;

            cy.externalPayment(id, title, amount);

        });

        it('Card', () => {

        });

        it('Voucher', () => {

            let expectedOpenAmt = new Intl.NumberFormat().format(openAmt);

            cy.get('[data-test-id="voucher"]').click();
            cy.get('[data-test-id="voucher-popup"]').should('be.visible').within(() => {
                cy.get('.modal-header').contains('Payment Voucher');
                cy.get('[data-test-id="open-amt"]').should('include.text', expectedOpenAmt);

                cy.get('[data-test-id="store"]').select("Dummy1 HQ");
                cy.get('[data-test-id="voucher-no"]').clear().type("XXXXXX");
                cy.get('[data-test-id="proceed"]').click();
            });

            cy.get('#alert-popup').should('be.visible').within(() => {
                cy.get('.modal-body').contains('Invalid voucher number!');
                cy.get('#close-alert-popup-button').click();
            });

            //generate voucher
            //close popups
            cy.get('[data-test-id="voucher-popup"]').within(() => { cy.get('.modal-header button').click(); });
            cy.get('[data-test-id="payment-popup"').within(() => { cy.get('.modal-header button').click(); });

            //get document no
            cy.get('[data-test-id="document-no"]').invoke('text').then($documentNo => {

                cy.get('#menu-dropdown > a').click();
                cy.get('#confirm-popup').should('be.visible').within(() => {
                    cy.get('#confirm-popup-yes-button').click();

                });

                cy.getVoucherNo(3).then($voucherNo => {
                	
                	cy.log(`Voucher# ${$voucherNo}`);

                    //go to sales
                    cy.get('#menu-dropdown > a').click();
                    cy.get('[data-test-id="sale"]').click();

                    //load order  
                    cy.get('#load-order-button').click();
                    cy.get('[data-test-id="load-order-popup"]').should('be.visible').within(() => {
                        cy.get('[data-test-id="store-id"]').select('Dummy1 HQ');
                        cy.get('[data-test-id="order-no"]').clear().type($documentNo);
                        cy.get('[data-test-id="proceed-button"]').click();
                    });

                    //click pay
                    cy.get('[data-test-id="pay-button"]').click();
                    cy.get('[data-test-id="voucher"]').click();

                    cy.get('[data-test-id="voucher-popup"]').within(() => {
                        cy.get('[data-test-id="store"]').select("Dummy1 HQ");
                        cy.get('[data-test-id="voucher-no"]').clear().type($voucherNo);
                        cy.get('[data-test-id="proceed"]').click();
                    });

                    cy.get('[data-test-id="voucher-popup"]').should('not.be.visible');
                });

            });

        });

        it('Loyalty', () => {

            cy.get('[data-test-id="loyalty"]').click();
            cy.get('#redeem-loyalty-popup').should('be.visible').within(() => {
                cy.get('.modal-header').contains('Redeem Loyalty');
                //cy.get('[data-test-id="open-amt"]').should('include.text',`${openAmt}`);
                cy.get('[data-test-id="proceed"]').click();
            });

        });

        it('Order Paid', () => {
            cy.get('[data-test-id="payment-popup"]').should('not.exist');
            cy.get('[data-test-id="open-amt"]').should('not.be.visible');
            cy.get('[data-test-id="pay-button"]').should('not.be.visible');
        });

    });


});