describe('Cashier Control', () => {

    before(() => {
        cy.login();
    })

    it('Cashier Control', () => {

        cy.get('#menu-dropdown > a').click();
		cy.get('[data-test-id="cashier-control"]').click();
        cy.location().should((location) => {
            expect(location.hash).to.eq('#/cashier-control');
        });

        //todo denomination popup

        cy.get('[data-test-id="cash-amount"]').clear().type(1000);
        cy.get('[data-test-id="external-card-amount"]').clear().type(1000);

        //cy.get('[data-test-id="denomination-button"]').click();
        cy.get('[data-test-id="save-button"]').click();

        //confirm popup
        cy.get('#confirm-popup').should('be.visible').within(() => {
            cy.contains('Do you want to save cashier control data?');
            cy.get('#confirm-popup-yes-button').click();    
        });

        cy.get('#info-popup').should('be.visible').within(() => {
            cy.contains('Cashier Control data successfully saved');
            cy.get('#close-info-popup-button').click();    
        });

        cy.location().should((location) => {
            expect(location.hash).to.eq('#/order-screen');
        });

    })
});