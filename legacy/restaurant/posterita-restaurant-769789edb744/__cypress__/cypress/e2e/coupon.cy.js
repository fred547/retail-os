describe('Coupon', () => {

  before(() => {
    cy.login();
  })
  
  function gotoSales(){
	  
	cy.placeOrder(0);

    //add some product
    cy.get('#search-product-textfield').type('Pizza{enter}');
    cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();
	  
  }
  
  describe('Popup', () => {
	  
	it('Test coupon popup', () => {	
		
		gotoSales();

	    cy.get('#more-options-button').click();
    	cy.get('.modal-dialog').should('be.visible').within( () => {
            cy.get('.modal-header').contains('More Options');
            cy.get("#redeem-coupon-button").should('be.visible').click();
		});

	    cy.get('[data-test-id="redeem-coupon-popup"]').should('be.visible').within( () => {    		
	        cy.get('.modal-header').contains('Redeem Coupon');
	        cy.get('[data-test-id="coupon_no"]').should('be.visible');
	        cy.get('[data-test-id="redeem-button"]').should('be.visible');
	        cy.get('.modal-header button').click();
	    });
	    
	    cy.get('[data-test-id="redeem-coupon-popup"]').should('not.exist');
	    cy.clearCart();
			  
	});
	
	describe('Redeem Coupon', () => {			
				
		describe('Invalid Coupon', () => {
			
			before(() => {
				gotoSales();
				cy.get('#more-options-button').click();
				cy.get("#redeem-coupon-button").click();
			});
			
			function validCoupon(coupon, err){
				cy.get('[data-test-id="redeem-coupon-popup"]').within( () => {    		
			        cy.get('[data-test-id="coupon_no"]').clear().type(coupon);
			        cy.get('[data-test-id="redeem-button"]').click();
			    });
				
				cy.get('#alert-popup').should('be.visible').within( () => {    		
		    		cy.get('.modal-body').contains(err);
		    		cy.get('#close-alert-popup-button').click();    		
		    	});
			}
			
			it('Not Issued', () => {				
				validCoupon('NOT_ISSUED_COUPON', 'Coupon [NOT_ISSUED_COUPON] has not been issued!');
			});
			
			it('Expired', () => {
				validCoupon('TEST_COUPON_EXPIRED', 'Coupon [TEST_COUPON_EXPIRED] has expired!');
			});
			
			it('Redeemed', () => {
				validCoupon('TEST_COUPON_REDEEMED', 'Coupon [TEST_COUPON_REDEEMED] has already been redeemed!');
			});
			
			after(() => {
				cy.get('[data-test-id="redeem-coupon-popup"]').within( () => {
			        cy.get('.modal-header button').click();
			    });
				cy.clearCart();
			});
			
		});
		
		describe('Valid Coupon', () => {
			
			beforeEach(() => {
				gotoSales();
				cy.get('#more-options-button').click();
				cy.get("#redeem-coupon-button").click();
			});
			
			it("Amount Coupon", () => {
				cy.get('[data-test-id="coupon_no"]').clear().type("TEST_COUPON_AMT");
		        cy.get('[data-test-id="redeem-button"]').click();
		        
		        cy.contains('#qty-total-container', '1x');
		        cy.contains('#sub-total-container','0.00');
		        cy.contains('#tax-total-container','0.00');
		        cy.contains('#grand-total-container','Rs 0.00');
		        
		        cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
		        	cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');
		        	cy.get('[data-test-id="product-name"]').eq(1).should('include.text', 'Coupon');
		        	cy.get('[data-test-id="product-description"]').eq(1).should('include.text', 'TEST_COUPON_AMT');
		        	//cy.get('[data-test-id="price"]').eq(1).should('include.text', depositAmt);
		        });

				cy.get('#checkout-button').click(); 

				cy.location().should((location) => {
		            expect(location.hash).to.eq('#/view-order');
		        });
			})
			
			it("Percentage Coupon", () => {
				cy.get('[data-test-id="coupon_no"]').clear().type("TEST_COUPON_PERCENTAGE");
		        cy.get('[data-test-id="redeem-button"]').click();
		        
		        cy.contains('#qty-total-container', '1x');
		        cy.contains('#sub-total-container','269.10');
		        cy.contains('#tax-total-container','0.00');
		        cy.contains('#grand-total-container','Rs 269.10');
		        
		        cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
		        	cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');
		        	cy.get('[data-test-id="product-name"]').eq(1).should('include.text', 'Coupon');
		        	cy.get('[data-test-id="product-description"]').eq(1).should('include.text', 'TEST_COUPON_PERCENTAGE');
		        	cy.get('[data-test-id="price"]').eq(1).should('include.text', '-29.90');
		        });

				cy.get('#checkout-button').click(); 
				
				cy.get('.modal-dialog').should('be.visible').within(() => {
					cy.get('[data-test-id="ext-card"]').click();
				});

				cy.get('[data-test-id="ext-payment-popup"]').should('be.visible').within(() => {
					cy.get('[data-test-id="proceed"]').click();
				});

				cy.location().should((location) => {
		            expect(location.hash).to.eq('#/view-order');
		        });
			})
			
		});
		
		
		
		
		  
	});
	  
  });

  it.skip('Redeem Coupon', () => {
    cy.get('#menu-dropdown > a').click();
    cy.get('[data-test-id="sale"]').click();

    //add some product
    cy.get('#search-product-textfield').type('Pizza{enter}');
    cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();

    cy.get('#more-options-button').click();
    cy.get("#redeem-coupon-button").click();

    cy.get('[data-test-id="redeem-coupon-popup"]').should('be.visible').within( () => {    		
      cy.get('.modal-header').contains('Redeem Coupon');
      cy.get('[data-test-id="coupon_no"]').type("");
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