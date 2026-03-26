// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('login', () => { 
    cy.visit('');
    localStorage.clear();  

    //select store and terminal
    cy.get('[data-test-id="store"').select('10006331');
    cy.get('[data-test-id="terminal"').select('10006545');
    cy.get('#login-button').click();

    //login user admin
    cy.get('#username').clear().type('Admin');
    cy.get('#password').clear().type('kaizen123');
    cy.get('#login-button').click();
 })

Cypress.Commands.add('openTillIfClosed', () => {

    //save hardware settings 
    cy.location().should((location) => {
        if(location.hash == '#/hardware-settings?nextPage=%2Fopen-till'){
            cy.get('[data-test-id="save-button"]').click();
            cy.get('#close-info-popup-button').click();
            cy.log('saved hardware');
        }
    });
    
    //open till if till was previously closed    
    cy.location().should((location) => {        
        if(location.hash == '#/open-till'){
            cy.get('[data-test-id="cash-amount-input"]').clear().type("1000");
            cy.get('[data-test-id="open-button"]').click();
            cy.log('open till');
        }        
    });

    return cy.wrap(null);
    
})

Cypress.Commands.add('getVoucherNo', (lines) => {
            
    cy.get('#menu-dropdown > a').click();
    cy.get('[data-test-id="refund"]').click();
    cy.get('#search-product-textfield').clear();
    cy.get('#search-product-textfield').type('Pizza{enter}');

    let arry = []
    for (let i = 0; i < lines; i++) { arry.push(i) }
    cy.wrap(arry).each(() => {
        cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();
        cy.wait(500);
    });

    cy.get('#sales-return-button').click();

    cy.get('[data-test-id="voucher"]').click();
    cy.wait(1000);
    cy.get('#confirm-popup-no-button').click();
    cy.get('[data-test-id="more-options-button"]').click();
    cy.get('[data-test-id="synchronize"]').click();
    cy.get('#confirm-popup-yes-button').click();
    cy.get('#close-info-popup-button').click();            

    return cy.get('[data-test-id="document-no"]').invoke('text');             

});

Cypress.Commands.add('pin', (pin) => {
    //enter pin
    cy.get('[data-test-id="pin-panel"]').within(()=>{
        cy.get('#popup-pin-textfield').type(pin);
        cy.get('.btn-success').click();
    });
    
});

Cypress.Commands.add('placeOrder', (table_id) => {

    cy.get('#menu-dropdown').click();

    //loading orderscreen
    cy.get('[data-test-id="take-order"]').click();

    //select dine-in
    cy.get('[data-test-id="dine-in"]').click();

    //enter pin
    cy.get('#popup-pin-textfield').type('8888');
    cy.get('.btn-success').click();

    //select table #0
    cy.get(`[data-test-id="table-${table_id}"]`).click();

    //place order
    cy.get('[data-test-id="place-order"]').click();
});

Cypress.Commands.add('clearTable', (table_id) => {

    cy.get('#menu-dropdown').click();
    
    //loading orderscreen
    cy.get('[data-test-id="take-order"]').click();

    //select dine-in
    cy.get('[data-test-id="dine-in"]').click();

    //enter pin
    cy.get('#popup-pin-textfield').type('8888');
    cy.get('.btn-success').click();

    //select table #0
    cy.get(`[data-test-id="table-${table_id}"]`).click();

    //clear order
    cy.get('[data-test-id="clear-table"]').click();
    cy.get('#confirm-popup-yes-button').click();
});

Cypress.Commands.add('clearCart', ()=>{
	cy.get('#clear-cart-button').should('exist').then(
        e => e.click()
    );

    cy.get('#confirm-popup').should('be.visible').within(() => {
        cy.contains('Do you want to clear order?');
        cy.get('#confirm-popup-yes-button').click();
    });
});
