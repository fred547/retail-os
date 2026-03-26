describe('Deposit', () => {

	let depositNo = "10000";
	let depositAmt = "600.00";

	function getDepositNo(){
		return depositNo;
	}

	function setDepositNo(x){
		depositNo = x;
	}

    before(() => {
        cy.login();
    })

	beforeEach(() => {
		cy.placeOrder(0);
	})
	    
    it('Test Deposit Popup', () => {
    
    	cy.get('#more-options-button').click();
    	cy.get('.modal-dialog').should('be.visible').within( () => {
            cy.get('.modal-header').contains('More Options');
            cy.get("#deposit-button").should('be.visible').click();
		});
    	
    	cy.get('[data-test-id="deposit-options-popup"]').should('be.visible').within( () => {
            cy.get('.modal-header').contains('Deposit Transactions');
            cy.get('[data-test-id="issue-deposit-button"]').should('be.visible').and('not.be.disabled');
            cy.get('[data-test-id="redeem-deposit-button"]').should('be.visible').and('be.disabled');
            cy.get('.modal-header button').click();
		});
    	
    	cy.get('[data-test-id="deposit-options-popup"]').should('not.exist');
    	
    });

    it('Issue Deposit', () => {
    	
    	cy.get('#more-options-button').click();
    	cy.get("#deposit-button").click();
    	cy.get('[data-test-id="issue-deposit-button"]').click();

		//intercept
		cy.intercept('POST', '**/service/Deposit/issue').as('issueDeposit');
		
    	
    	cy.get('[data-test-id="issue-deposit-popup"]').should('be.visible').within( () => {    		
    		cy.get('.modal-header').contains('Issue Deposit');
    		cy.get('[data-test-id="amount"]').clear().type(depositAmt);
    		cy.get('[data-test-id="proceed-button"]').click();    		
    	});  
    	
    	cy.get('[data-test-id="issue-deposit-popup"]').should('not.exist');

		cy.wait('@issueDeposit').then(({ request, response }) => {
			let body = response.body;

			if(!body.depositno){
				body = JSON.parse(response.body);
			}

			cy.wrap(body.depositno).as('abc');			
		});

		cy.get('@abc').then(function (aliasValue){
			cy.log(`Deposit No -> ${ aliasValue }`);
			setDepositNo(aliasValue);
		});

		
    	
    	cy.contains('#qty-total-container', '0x');
        cy.contains('#sub-total-container',depositAmt);
        cy.contains('#tax-total-container','0.00');
        cy.contains('#grand-total-container',depositAmt);
        
        cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
        	cy.get('[data-test-id="qty"]').eq(0).should('include.text', '1');
        	cy.get('[data-test-id="product-name"]').eq(0).should('include.text', 'Issue Deposit');
        	cy.get('[data-test-id="product-description"]').eq(0).should('include.text', 'Issue Deposit -');
        	cy.get('[data-test-id="price"]').eq(0).should('include.text', depositAmt);
        });

		cy.get('#checkout-button').click(); 
		cy.get(`[data-test-id="ext-card"]`).click();
		cy.get('[data-test-id="proceed"]').click();
		
		cy.location().should((location) => {
            expect(location.hash).to.eq('#/view-order');
        });
    	
   	});
 
    
    it('Redeem Deposit', () => {

		cy.get('#search-product-textfield').type('Pizza{enter}');
        cy.get('[data-test-id="product-search-result-product-info"]').eq(0).click();

		cy.get('#more-options-button').click();
    	cy.get("#deposit-button").click();
    	cy.get('[data-test-id="redeem-deposit-button"]').click();

		cy.get('[data-test-id="redeem-deposit-popup"]').should('be.visible').within( () => {    		
    		cy.get('.modal-header').contains('Redeem Deposit');
    		cy.get('[data-test-id="deposit-no"]').clear().type("00000000");
    		cy.get('[data-test-id="proceed-button"]').click();    		
    	});

		cy.get('#alert-popup').should('be.visible').within( () => {    		
    		cy.get('.modal-body').contains('Deposit [00000000] not found!');
    		cy.get('#close-alert-popup-button').click();    		
    	});

		cy.get('[data-test-id="redeem-deposit-popup"]').within( () => {    
    		cy.get('[data-test-id="deposit-no"]').clear().type(depositNo);
    		cy.get('[data-test-id="proceed-button"]').click();    		
    	});

		cy.contains('#qty-total-container', '1x');
        cy.contains('#sub-total-container','0.00');
        cy.contains('#tax-total-container','0.00');
        cy.contains('#grand-total-container','Rs 0.00');
        
        cy.get('[data-test-id="shopping-cart-lines"]').within(() => {
        	cy.get('[data-test-id="qty"]').eq(1).should('include.text', '1');
        	cy.get('[data-test-id="product-name"]').eq(1).should('include.text', 'Redeem Deposit');
        	cy.get('[data-test-id="product-description"]').eq(1).should('include.text', 'Redeem Deposit -');
        	cy.get('[data-test-id="price"]').eq(1).should('include.text', depositAmt);
        });

		cy.get('#checkout-button').click(); 

		cy.location().should((location) => {
            expect(location.hash).to.eq('#/view-order');
        });

	});

})
    
    