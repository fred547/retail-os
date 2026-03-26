describe('Synchronize', () => {

    before(() => {
        cy.login();
    })

    it('Synchronize', () => {

        cy.get("#menu-dropdown > a").should('exist').click();
        cy.location().should((location) => {
            expect(location.hash).to.eq('#/menu');
        });

        cy.get('[data-test-id="synchronize"]').should('exist').click();

        cy.get('[data-test-id="synchronize-popup"]').should('be.visible').within(() => {
            cy.get(".modal-header").should('include.text','Synchronize POS');            
            cy.get('[data-test-id="cancel-popup"]').click();
        });

        cy.get('[data-test-id="synchronize-popup"]').should('not.exist');

        cy.get('[data-test-id="synchronize"]').click();

        cy.get('[data-test-id="synchronize-popup"]').should('be.visible').within(() => {
            cy.get('[data-test-id="synchronize-button"]').should('exist').click();
        });

        cy.get('[data-test-id="progress-modal-popup"]').should('be.visible');
        
        cy.wait(1000 * 10);
        
        cy.get('[data-test-id="progress-modal-popup"]').should('not.exist');

        cy.get('#info-popup').should('be.visible').within(() => {
            cy.contains('POS was successfully synchronized');
            cy.get('#close-info-popup-button').click();   
        });

        //login page - #/login
        cy.location().should((location) => {
            expect(location.hash).to.eq('#/login');
        });
        
    })
});