// login.spec.js created with Cypress
//
// Start writing your Cypress tests below!
// If you're unfamiliar with how Cypress works,
// check out the link below and learn how to write your first test:
// https://on.cypress.io/writing-first-test
describe("Posterita - Offline", ()=>{

    describe("Login", ()=>{

        before("", () => {
            cy.visit(''); 
            localStorage.clear();                 
        });

        it('Test Select Store/Terminal', () => {
            cy.get('.login-title').should('include.text', 'Select Store and Terminal');
            cy.get('[data-test-id="store"').select('10006331');
            cy.get('[data-test-id="terminal"').select('10006545');
            cy.get('#login-button').click();
        });

        it('Test Login Form', () => { 
            cy.get('.login-title').should('include.text', 'Log In');
            cy.get('#store-name-container').contains("Dummy1 HQ");
            cy.get('#terminal-name-container').contains("Terminal 1");
            cy.get('#store-name-container').should('have.text', 'Dummy1 HQ');
            cy.get('#terminal-name-container').should('have.text', 'Terminal 1');

            cy.get('#username').should('be.visible');
            cy.get('#password').should('be.visible');
            cy.get('#login-button').should('be.visible');

            cy.get('#username').clear();
            cy.get('#username').type('Admin');

            cy.get('#password').clear();
            cy.get('#password').type('donotknow');

            cy.get('#login-button').click();

            cy.get('#alert-popup').should('be.visible').and('include.text', 'Invalid username or password!');
            cy.get('#close-alert-popup-button').click();

            cy.get('#alert-popup').should('not.exist');              
            
        }); 
        
        it('Login', () => {
            cy.get('#password').clear();
            cy.get('#password').type('kaizen123');
            cy.get('#login-button').click(); 
                            
        });

        it('Save hardware settings', () => {
            //save hardware settings

            cy.hash().should('not.contain','#/login').then(hash => {

                cy.log(hash);

                return new Cypress.Promise((resolve) => {
                    if(hash.includes('#/hardware-settings')){

                        cy.log('save hardware settings');

                        cy.get('[data-test-id="save-button"]').click();
                        cy.get('#close-info-popup-button').click();
                        resolve();
                        return;
                    }

                    resolve();
                });

                
            });
        });

        it('Open till', () => {
            //open till with 1000 float amount

            cy.hash().should('not.contain','#/login').and('not.contain','#/hardware-settings').then(hash => {
                
                cy.log(hash);

                return new Cypress.Promise((resolve) => {

                    if(hash.includes('#/open-till')){

                        cy.log('open till with 1000 float amount');

                        cy.get('[data-test-id="cash-amount-input"]').clear().type("1000");
                        cy.get('[data-test-id="open-button"]').click();
                        resolve();
                    }

                    resolve();

                });                
                
            });
        });

        it('Check Logged User Info', () => {
            cy.get('#menu-terminal-info').should('include.text','Admin').and('include.text','Administrator');
        });

        /*
        it('Check if user is displayed as sales rep', () => {
            cy.get('.commission').should('include.text','Admin')
        });
        */

        it('Check menu icon', () => {
            cy.get("#menu-dropdown > a").should('exist').click();
            cy.location().should((location) => {
                expect(location.hash).to.eq('#/menu');
            });
        });

        it('Check if user is clocked in', () => {

            cy.get('#clock-inout-menu').should('exist').click();

            cy.get('[data-test-id="clock-in-clock-out-popup"]').should('be.visible');
            cy.get('[data-test-username="Admin"]').should('exist').and('include.text','Admin');
            cy.get('[data-test-id="ok-button"]').click();
            cy.get('[data-test-id="clock-in-clock-out-popup"]').should('not.exist');
        });

        it('Log out user', () => {
            cy.get('#clock-inout-menu').click();
            cy.get('[data-test-username="Admin"]').click();
            cy.get('[data-test-id="clock-out-user-popup"]').should('be.visible');
            cy.get('[data-test-id="clock-out-user-popup"]').within(()=>{
                cy.get('#username').should('have.value','Admin');
                cy.get('#password').clear().type('kaizen123');
                cy.get('[data-test-id="ok-button"]').click();
            });

            cy.get('[data-test-id="clock-in-clock-out-popup"]').within(()=>{
                cy.get('[data-test-username="Admin"]').should('not.exist');
                cy.get('[data-test-id="ok-button"]').click();
            });

            
        });

        it('Log out', () => {
            cy.get('#menu-logout').should('be.visible').click();
            cy.get('#confirm-popup').should('be.visible').and('include.text','Do you want to logout?');            
            cy.get('#confirm-popup-no-button').should('exist');
            cy.get('#confirm-popup-yes-button').should('exist').click();

            cy.location().should((location) => {
                expect(location.hash).to.eq('#/login');
            });
        });
    })
});