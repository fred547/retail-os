describe('Promotion', () => {

  before(() => {
    cy.login();
  })

  it('Redeem Promotion', () => {
    cy.placeOrder(0);

    //add some product
    cy.get('#search-product-textfield').type('Pizza{enter}');
    cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();

    //select loyalty customer
    cy.get('.customer-search-textfield').clear().type('Test Loyalty');
    cy.get('ul.dropdown-menu >li').eq(0).click();    

    cy.get('#more-options-button').click();
    cy.get("#promotions-button").click();

    cy.get('[data-test-id="promotions-popup"]').should('be.visible').within( () => {    		
      cy.get('.modal-header').contains('Promotions');
      cy.get('[data-test-id="promotion"]').should('have.length',1);
      cy.get('[data-test-id="redeem-button"]').eq(0).click();
    });

    cy.contains('#qty-total-container', '1x');
    cy.contains('#sub-total-container','0.00');
    cy.contains('#tax-total-container','0.00');
    cy.contains('#grand-total-container','Rs 0.00');
    
    cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
      cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');
      cy.get('[data-test-id="product-name"]').eq(1).should('include.text', 'Redeem Promotion');
      cy.get('[data-test-id="product-description"]').eq(1).should('include.text', 'Pizza');
      cy.get('[data-test-id="price"]').eq(1).should('include.text', '-1,000.00');
    });

    cy.get('#checkout-button').click(); 

		cy.location().should((location) => {
        expect(location.hash).to.eq('#/view-order');
    });

  })
})