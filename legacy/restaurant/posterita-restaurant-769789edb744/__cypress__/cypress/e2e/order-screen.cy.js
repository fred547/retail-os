describe('Test OrderScreen', () => {

    before(() => {
        cy.login();
        cy.placeOrder(0);
    });

    it('User Info', function() {
        cy.get('#menu-terminal-info > span').click();
        cy.get('#terminal-info-popup').should('be.visible')
        .and('include.text', 'Admin')
        .and('include.text', 'Administrator')
        .and('include.text', 'Dummy1 HQ')
        .and('include.text', 'Terminal 1');        
        cy.get('.modal-footer > .btn').click();
        cy.get('#terminal-info-popup').should('not.exist');
    });

    it('Glider', () => {
        cy.get('.glider-container').should('be.visible');
        cy.get('.glider-container .glider-tile').should('not.have.length', 0);
        cy.get('.glider-container > :nth-child(6)').click();

        cy.get('.glider-container > .column-container').should('be.visible');
        cy.get('.glider-container .glider-tile').should('not.have.length', 0);
        cy.get('.glider-container > .column-container > :nth-child(2) > button').click();
    });

    describe('Customer', () => {

        it('Customer Info', () => {
            cy.get('#customer_info_button').click();
            cy.get('#customer-info-popup').should('be.visible');
            cy.get('#customer-info-popup').should('include.text', 'Walk-in Customer');
            cy.get('.modal-footer > .btn > div').click();
            cy.get('#customer-info-popup').should('not.exist');
        });

        it('Search and Select Customer', () => {
            cy.get('.customer-search-textfield').should('be.visible').clear().type('Test');
            cy.get('ul.dropdown-menu >li').eq(1).click();

            cy.get('#customer_info_button').click();
            cy.get('#customer-info-popup').should('include.text', 'Test');
            cy.get('.modal-footer > .btn > div').click();
            
        });

        it.skip('Create Customer', () => {
            cy.get('#create_customer_button').click();
            cy.get('#create-customer-popup').should('be.visible');
            cy.get('#create-customer-popup').within(()=>{
                cy.get('#customer_id').clear().type('Cypress');
                cy.get('#name').clear().type('Cypress');
                cy.get("#save-button").click();                
            });

            cy.get('#info-popup').should('be.visible').and('include.text', 'Customer Cypress created');
            cy.get("#close-info-popup-button").click();
            
            cy.get('.customer-search-textfield').should('have.value','Cypress');
        });
        
    });

    describe('Search Product', () => {
        
        it('Test search components', () => {

            cy.get('#search-product-button').should('be.visible');
            cy.get('#search-product-textfield').should('be.visible');
      
        });

        it('Search All', () => {

            cy.get('#search-product-button').click();
            cy.get('[data-test-id="product-search-result-list"]').should('be.visible');
            cy.get('[data-test-id="product-search-result-product-info"]').should('not.have.length', 0);
      
        });

        it('Search Non Existing product', () => {

            cy.get('#search-product-textfield').type('Non existing product');
            cy.get('#search-product-button').click();
      
            cy.get('#alert-popup').should('be.visible');
            cy.get('#close-alert-popup-button').click();
      
          });
      
          it('Search By Name', () => {
      
            cy.get('#search-product-textfield').type('F01 - Margherita');
            cy.get('#search-product-button').click();
            cy.get('[data-test-id="product-search-result-list"]').should('be.visible');
            cy.get('[data-test-id="product-search-result-product-info"]').should('have.length', 1);
      
          });
      
          it('Search By Barcode', () => {
      
            //{enter}
            cy.get('#search-product-textfield').type('f01{enter}');
            cy.get('[data-test-id="product-search-result-list"]').should('be.visible');
            cy.get('[data-test-id="product-search-result-product-info"]').should('have.length', 1);
      
          });
      
          it('Search By Description', () => {
            cy.get('#search-product-textfield').type('Margherita Pizza{enter}');
            cy.get('[data-test-id="product-search-result-list"]').should('be.visible');
            cy.get('[data-test-id="product-search-result-product-info"]').should('have.length', 1);
          });
      
          it('Search By Primary Group', () => {
            cy.get('#search-product-textfield').type('Pizza{enter}');
            cy.get('[data-test-id="product-search-result-list"]').should('be.visible');
            cy.get('[data-test-id="product-search-result-product-info"]').should('have.length', 20);
          });
      
    });

    describe.only('Shopping Cart', () => {        

        it('Test cart totals', () => {
            cy.contains('#qty-total-container', '0x');
            cy.contains('#sub-total-container','0.00');
            cy.contains('#tax-total-container','0.00');
            cy.contains('#grand-total-container','Rs 0.00');
        });


        describe('Scan Items', ()=>{

            afterEach(() => {
                _clearCart();
            });

            it('Scan Barcode', () => {                        
                cy.get('#search-product-textfield').type('878999797979789{enter}');
                cy.contains('#qty-total-container', '1x');
                cy.contains('#sub-total-container','4.00');
                cy.contains('#tax-total-container','0.00');
                cy.contains('#grand-total-container','Rs 4.00');
            });
    
            it('Scan Weight Barcode', () => {            
                cy.get('#search-product-textfield').type('2200001123456{enter}');
                cy.contains('#qty-total-container', '12.345x');
                cy.contains('#sub-total-container','1,234.50');
                cy.contains('#tax-total-container','0.00');
                cy.contains('#grand-total-container','Rs 1,234.50');
            });
    
            it('Manual Selection', () => {
                cy.get('#search-product-textfield').type('Pizza{enter}');
                cy.get('[data-test-id="product-search-result-product-info"]').first().click();
                cy.wait(500);
                cy.get('[data-test-id="product-search-result-product-info"]').first().click();
                cy.contains('#qty-total-container', '2x');
                cy.contains('#sub-total-container','598.00');
                cy.contains('#tax-total-container','0.00');
                cy.contains('#grand-total-container','Rs 598.00');
            });
    
            it('Taxable Product', () => {
                cy.get('#search-product-textfield').type('Homemade Hummus{enter}');
                cy.get('[data-test-id="product-search-result-product-info"]').first().click();
                cy.contains('#qty-total-container', '1x');
                cy.contains('#sub-total-container','2.61');
                cy.contains('#tax-total-container','0.39');
                cy.contains('#grand-total-container','Rs 3.00');
            });
    
            it('Open Items', () => {
                cy.get('#search-product-textfield').type('Open Item{enter}');
                cy.get('[data-test-id="product-search-result-product-info"]').first().click();
    
                cy.get('.modal-dialog').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Edit on Fly');
                    cy.get('input[name="price"]').clear().type('100');
                    cy.get('input[name="description"]').clear().type('XXXXXX');
                    cy.get('.modal-footer button').click();
                });
    
                cy.contains('[data-test-id="product-description"]','XXXXXX');
    
                cy.contains('#qty-total-container', '1x');
                cy.contains('#sub-total-container','86.96');
                cy.contains('#tax-total-container','13.04');
                cy.contains('#grand-total-container','Rs 100.00');
            });

        });

        

        describe('Shopping Cart Line', () => {

            beforeEach(() => {  
                /*              
                cy.get('#clear-cart-button').should('exist').then(
                    e => e.click()
                );
                */
                cy.get('#search-product-textfield').type('878999797979789{enter}');
            });

            afterEach(() => {
                _clearCart();
            });

            it('Info', () => {
                cy.get('[data-test-id="info"]').eq(0).click();
                cy.get('[data-test-id="line-comment-popup"]').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Barilla Mezze Penne');
                    cy.get('.modal-footer button').eq(0).click();
                });
            });

            it('Qty', () => {

                /*update qty*/
                cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1').click();
                cy.get('.modal-dialog').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Line Item');
                    cy.get('input[name="qty"]').should('have.value', 1).clear().type('4');
                    cy.get('.modal-footer button').eq(0).should('be.disabled');
                    cy.get('.modal-footer button').eq(1).click();
                });

                cy.contains('#qty-total-container', '4x');

                /*split qty*/
                cy.get('[data-test-id="qty"]').eq(0).click();
                cy.get('.modal-dialog').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Line Item');
                    cy.get('input[name="qty"]').should('have.value', 4).clear().type('4');
                    cy.get('.modal-footer button').eq(0).should('not.be.disabled').click();
                });


                cy.get('[data-test-id="split-line-popup"]').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Split Line Item');                    
                });

                cy.get('[data-test-id="split-line-popup-qty-textfield"]').clear().type('8');
                cy.get('[data-test-id="split-line-popup-split-button"]').click();


                cy.get('#alert-popup').should('be.visible').within( () => {
                    cy.get('.modal-body').contains('Qty entered must be less than 4!');
                    cy.get('.modal-footer button').eq(0).click();
                });
                
                cy.get('[data-test-id="split-line-popup-qty-textfield"]').clear().type('1');
                cy.get('[data-test-id="split-line-popup-split-button"]').click();

                cy.get('[data-test-id="qty"]').eq(0).should('include.text', '3');
                cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');

                cy.contains('#qty-total-container', '4x');
                
            });

            it('Price', () => {

                cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1').click();
                cy.get('.modal-dialog').should('be.visible').within( () => {
                    cy.get('input[name="qty"]').should('have.value', 1).clear().type('2');
                    cy.get('.modal-footer button').eq(0).should('be.disabled');
                    cy.get('.modal-footer button').eq(1).click();
                });
                
                cy.get('[data-test-id="price"]').eq(0).should('include.text', '8.00').click();
                cy.get('.modal-dialog').should('be.visible').within( () => {
                    cy.get('.modal-header').contains('Line Item Discount'); 
                    
                    //check initial values
                    cy.get('input[name="price"]').should('have.value', '4');  
                    cy.get('input[name="total"]').should('have.value', '8');  
                    cy.get('input[name="discount"]').should('have.value', '0');                       
                    cy.contains("Discount Given: 0.00");      
                    
                    //change price
                    cy.get('input[name="price"]').clear().type('2');
                    cy.get('input[name="total"]').should('have.value', '4');  
                    cy.get('input[name="discount"]').should('have.value', '50');                                          
                    cy.contains("Discount Given: 4.00");
                    
                    //change total
                    cy.get('input[name="total"]').clear().type('6');
                    cy.get('input[name="price"]').should('have.value', '3');                     
                    cy.get('input[name="discount"]').should('have.value', '25');                                          
                    cy.contains("Discount Given: 2.00");

                    //change percentage                     
                    cy.get('input[name="discount"]').clear().type('40'); 
                    cy.get('input[name="price"]').should('have.value', '2.4');  
                    cy.get('input[name="total"]').should('have.value', '4.8');                       
                    cy.contains("Discount Given: 3.20");

                    //reset
                    cy.get('.modal-footer button').eq(0).click();

                    cy.get('input[name="price"]').should('have.value', '4');  
                    cy.get('input[name="total"]').should('have.value', '8');  
                    cy.get('input[name="discount"]').should('have.value', '0');                       
                    cy.contains("Discount Given: 0.00");  

                    //apply discount
                    cy.get('input[name="discount"]').clear().type('40'); 
                    cy.get('input[name="price"]').should('have.value', '2.4');  
                    cy.get('input[name="total"]').should('have.value', '4.8');                       
                    cy.contains("Discount Given: 3.20");

                    cy.get('.modal-footer button').eq(2).click();
                });

                cy.get('[data-test-id="price"]').eq(0).should('include.text', '4.80');
                cy.get('[data-test-id="discount-message"]').eq(0).should('include.text', '40.00% off, Saved(3.20)');

            });

            it('Remove', () => {
                cy.get('[data-test-id="delete"]').eq(0).click();
                
                cy.contains('#qty-total-container', '0x');
                cy.contains('#sub-total-container','0.00');
                cy.contains('#tax-total-container','0.00');
                cy.contains('#grand-total-container','Rs 0.00');
            });
        });

        it('Discount on total', () => {

            cy.get('#search-product-textfield').type('878999797979789{enter}');
            cy.get('#search-product-textfield').type('878999797979789{enter}');
            
            cy.get('#grand-total-container').click();

            cy.get('.modal-dialog').should('be.visible').within( () => {
                cy.get('.modal-header').contains('Discount on Total');
                cy.get('input[name="discount"]').should('have.value', 0);
                cy.get('input[name="price"]').should('have.value', 0);
                cy.get('input[name="total"]').should('have.value', 8);

                //percentage
                cy.get('input[name="discount"]').clear().type(10);
                cy.get('input[name="price"]').should('have.value', 0.8);
                cy.get('input[name="total"]').should('have.value', 7.2);

                //amount
                cy.get('input[name="price"]').clear().type(1);
                cy.get('input[name="discount"]').should('have.value', 12.5);
                cy.get('input[name="total"]').should('have.value', 7);

                //total
                cy.get('input[name="total"]').clear().type(6);
                cy.get('input[name="discount"]').should('have.value', 25);
                cy.get('input[name="price"]').should('have.value', 2);

                //apply
                cy.get('.modal-footer button').eq(1).click();                
            });

            cy.contains('#qty-total-container', '2x');
            cy.contains('#sub-total-container','6.00');
            cy.contains('#tax-total-container','0.00');
            cy.contains('#grand-total-container','Rs 6.00'); 
            
            _clearCart();

        });

        describe('Commission', () => {

            beforeEach(()=>{
                cy.get('#search-product-textfield').type('878999797979789{enter}');
                cy.get('[data-test-id="commission-sales-rep"]').eq(0).as('firstSalesRep');
                cy.get('[data-test-id="commission-sales-rep"]').eq(1).as('secondSalesRep');
            });

            afterEach(() => {
                _clearCart();
            });

            it('Select sales rep', () => { 
                cy.get('@firstSalesRep').click();
                cy.get('@firstSalesRep').should('have.class', 'active');
                cy.get('@firstSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '4.00');
                });
    
                cy.get('@secondSalesRep').click();
                cy.get('@secondSalesRep').should('have.class', 'active');
                cy.get('@secondSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '4.00');
                });
    
                cy.get('@firstSalesRep').should('not.have.class', 'active');
            });

            it('Split Order - Equally', () => {
                cy.get('@firstSalesRep').click();
                cy.get('#more-options-button').click();
                cy.get('#more-options-popup').should('be.visible');
                cy.get('#split-order-button').click();

                cy.get('[data-test-id="split-order-popup"]').should('be.visible').within(() => {

                    cy.get('[data-test-id="commission"]').eq(0).should('have.class', 'active');
                    cy.get('[data-test-id="amount"]').eq(0).should('include.text', '4.00');

                    cy.get('[data-test-id="commission"]').eq(1).should('have.not.class', 'active');
                    cy.get('[data-test-id="amount"]').eq(1).should('include.text', '0.00');

                    cy.get('[data-test-id="commission"]').eq(1).click();
                    cy.get('[data-test-id="commission"]').eq(1).should('have.class', 'active');
                    cy.get('[data-test-id="amount"]').eq(1).should('include.text', '0.00');
                    cy.get('[data-i18n="split.equally"]').click();              

                });

                cy.get('@firstSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '2.00');                        
                });
                cy.get('@secondSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '2.00');
                });
            });

            it('Split Order - Custom', () => {
                cy.get('@firstSalesRep').click();

                cy.get('#more-options-button').click();
                cy.get('#split-order-button').click();

                cy.get('[data-test-id="split-order-popup"]').within(() => {
                    cy.get('[data-test-id="commission"]').eq(1).click(); //select second sales rep also
                    cy.get('[data-test-id="custom"]').click();

                    cy.get('[data-test-id="amount"]').eq(0).clear().type(3);
                    cy.get('[data-test-id="amount"]').eq(1).clear().type(1);

                    cy.get('[data-test-id="split"]').click();
                });

                cy.get('@firstSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '3.00');                        
                });
                cy.get('@secondSalesRep').within( () => {
                    cy.get('[data-test-id="amount"]').should('include.text', '1.00');
                });
            });
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