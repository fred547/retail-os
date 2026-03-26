describe('Gift Card', () => {

  let cardNo = new Date().getTime() % 100000000;
  let cardAmt = 650;
  let reloadAmt = 100;

  before(() => {
    cy.login();
  })

  beforeEach(() => {
    cy.placeOrder(0);
  });

  it('Gift Card Transations', () => {

    cy.get('#more-options-button').click();
    cy.get('.modal-dialog').should('be.visible').within(() => {
      cy.get('.modal-header').contains('More Options');
      cy.get("#gift-card-button").should('be.visible').click();
    });

    cy.get('[data-test-id="gift-card-options-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Gift Card Transactions');
      cy.get('[data-test-id="issue-button"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-test-id="reload-button"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-test-id="balance-button"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-test-id="redeem-button"]').should('be.visible').and('be.disabled');
      //cy.get('[data-test-id="refund-button"]').should('be.visible').and('be.not.disabled');
      cy.get('.modal-header button').click();
    });

    cy.get('[data-test-id="deposit-options-popup"]').should('not.exist');
  })

  it('Issue', () => {

    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="issue-button"]').click();

    cy.get('[ data-test-id="issue-gift-card-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Issue Gift Card');
      cy.get('[data-test-id="card-no"]').clear().type(cardNo);
      cy.get('[data-test-id="amount"]').clear().type(cardAmt);
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.contains('#qty-total-container', '0x');
    cy.contains('#sub-total-container', cardAmt);
    cy.contains('#tax-total-container', '0.00');
    cy.contains('#grand-total-container', cardAmt);

    cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
      cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1');
      cy.get('[data-test-id="product-name"]').eq(0).should('include.text', 'Issue Gift Card');
      cy.get('[data-test-id="product-description"]').eq(0).should('include.text', `Issue Gift Card - ${cardNo}`);
      cy.get('[data-test-id="price"]').eq(0).should('include.text', cardAmt);
    });

    cy.get('#checkout-button').click();
    cy.get(`[data-test-id="ext-card"]`).click();
    cy.get('[data-test-id="proceed"]').click();

    cy.location().should((location) => {
      expect(location.hash).to.eq('#/view-order');
    });

  });

  it('Reload', () => {

    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="reload-button"]').click();

    cy.get('[ data-test-id="reload-gift-card-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Reload Gift Card');
      cy.get('[data-test-id="card-no"]').clear().type(cardNo);
      cy.get('[data-test-id="amount"]').clear().type(reloadAmt);
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.contains('#qty-total-container', '0x');
    cy.contains('#sub-total-container', reloadAmt);
    cy.contains('#tax-total-container', '0.00');
    cy.contains('#grand-total-container', reloadAmt);

    cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
      cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1');
      cy.get('[data-test-id="product-name"]').eq(0).should('include.text', 'Reload Gift Card');
      cy.get('[data-test-id="product-description"]').eq(0).should('include.text', `Reload Gift Card - ${cardNo}`);
      cy.get('[data-test-id="price"]').eq(0).should('include.text', reloadAmt);
    });

    cy.get('#checkout-button').click();
    cy.get(`[data-test-id="ext-card"]`).click();
    cy.get('[data-test-id="proceed"]').click();

    cy.location().should((location) => {
      expect(location.hash).to.eq('#/view-order');
    });

  });

  it('Check Balance', () => {

    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="balance-button"]').click();

    cy.get('[data-test-id="check-gift-card-balance-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Check Gift Card Balance');
      cy.get('[data-test-id="card-no"]').clear().type('xxxxxxxx');
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.get('#alert-popup').should('be.visible').within(() => {
      cy.get('.modal-body').contains('Invalid card number');
      cy.get('#close-alert-popup-button').click();
    });


    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="balance-button"]').click();

    cy.get('[data-test-id="check-gift-card-balance-popup"]').within(() => {
      cy.get('[data-test-id="card-no"]').clear().type(cardNo);
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.get('[data-test-id="gift-card-balance-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Gift Card Balance');
      cy.get('[data-test-id="card-no"]').should('include.text', cardNo);
      cy.get('[data-test-id="amount"]').should('include.text', cardAmt + reloadAmt);
      cy.get('[data-test-id="balance"]').should('include.text', cardAmt + reloadAmt);
      cy.get('[data-test-id="reloaded-amount"]').should('include.text', reloadAmt);
      cy.get('[data-test-id="ok-button"]').click();
    });


  });

  it('Redeem', () => {

    cy.get('#search-product-textfield').type('Pizza{enter}');
    cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();
    cy.wait(500);
    cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();

    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="redeem-button"]').click();

    cy.get('[data-test-id="redeem-gift-card-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Redeem Gift Card');
      cy.get('[data-test-id="card-no"]').clear().type(cardNo);
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.contains('#qty-total-container', '2x');
    cy.contains('#sub-total-container', '0.00');
    cy.contains('#tax-total-container', '0.00');
    cy.contains('#grand-total-container', 'Rs 0.00');

    cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
      cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');
      cy.get('[data-test-id="product-name"]').eq(1).should('include.text', 'Redeem Gift Card');
      cy.get('[data-test-id="product-description"]').eq(1).should('include.text', `Redeem Gift Card - ${cardNo}`);
      cy.get('[data-test-id="price"]').eq(1).should('include.text', -1 * (cardAmt + reloadAmt));
    });

    cy.get('#checkout-button').click();

    cy.location().should((location) => {
      expect(location.hash).to.eq('#/view-order');
    });

  });

  it('Refund', () => {   
    
    let balance = "152.00";
  
    cy.get('#menu-dropdown > a').click();
    cy.get('[data-test-id="refund"]').click();

    cy.get('#more-options-button').click();
    cy.get("#gift-card-button").click();
    cy.get('[data-test-id="refund-button"]').click();
    
    cy.get('[data-test-id="refund-balance-gift-card-popup"]').should('be.visible').within(() => {
      cy.get('.modal-header').contains('Refund Gift Card Balance');
      cy.get('[data-test-id="card-no"]').clear().type(cardNo);
      cy.get('[data-test-id="proceed-button"]').click();
    });

    cy.contains('#qty-total-container', '1x');
    cy.contains('#sub-total-container', balance);
    cy.contains('#tax-total-container', '0.00');
    cy.contains('#grand-total-container', balance);

    cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
      cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1');
      cy.get('[data-test-id="product-name"]').eq(0).should('include.text', 'Refund Gift Card');
      cy.get('[data-test-id="product-description"]').eq(0).should('include.text', `Refund Gift Card - ${cardNo}`);
      cy.get('[data-test-id="price"]').eq(0).should('include.text', balance);
    });

    cy.get('#sales-return-button').click();
    cy.get(`[data-test-id="cash"]`).click();

    cy.location().should((location) => {
      expect(location.hash).to.eq('#/view-order');
    });

  });



})