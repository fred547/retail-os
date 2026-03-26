var ClockInOutManager = {
		
		clockIn : function(username, password){
			/* validate user */
			var user = APP.USER.getUser(username, password);
			if(user == null){
				alert(I18n.t("invalid.username.password"));
				return;
			}
			
			/* check if user is active */
            if ( user.isactive == 'N' ) {
            	
            	alert(I18n.t("user.deactivated"));                
                return;
            	
            }
			
			var terminal = TerminalManager.terminal;
			var time = DateUtil.getCurrentDate();
			
			/* clock in user */
			ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(msg) {
			    alert(msg);
			    /* hide clockinout popup */
			    PopUpManager.activePopUp.hide();
			}).fail(function(msg) {
			    alert(msg);
			});
		},
		
		clockOut : function(username, password){
			/* clocking out only left sales rep */
			if(ClockInOut.clockedInUsers.length == 1){
				/* Request permission */
				if(!window.confirm(I18n.t("clocking.out.last.user"))){
					return;
				}
			}
			
			/* validate user */
			var user = APP.USER.getUser(username, password);
			if(user == null){
				alert(I18n.t("invalid.username.password"));
				return;
			}
			
			var terminal = TerminalManager.terminal;
			var time = DateUtil.getCurrentDate();
			
			/* clock out user */
			ClockInOut.clockOut(terminal.id, user.ad_user_id, time).done(function(msg) {
			    alert(msg);
			    /* hide clockinout popup */
			    PopUpManager.activePopUp.hide();
			}).fail(function(msg) {
			    alert(msg);
			});
		},
		
		clockOutAll : function(){
			var terminal = TerminalManager.terminal;
			var time = DateUtil.getCurrentDate();
			
			ClockInOut.clockOutAll(terminal.id, time).done(function(msg) {
			    alert(msg);
			}).fail(function(msg) {
			    alert(msg);
			});
		},
		
		getClockedInUsers : function(){
			var terminal = TerminalManager.terminal;
			ClockInOut.getClockedInUsers(terminal.id).done(function(msg) {
			    
			}).fail(function(msg) {
			    alert(msg);
			});
		}
};

var ClockInOut = {
		
		clockedInUsers : [],

		clockIn : function(terminal_id, user_id, time_in){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['user_id'] = user_id;
			post['time_in'] = time_in;
			post['action'] = "clockIn";

			post = JSON.stringify(post);

			jQuery.get(
			    "/clockinout/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject(I18n.t("failed.to.clock.in.user"));
			            return;
			        }

			        if (json.error) {
			            dfd.reject(I18n.t("failed.to.clock.in.user") +" " + json.error);
			            return;
			        }
			        
			        var clockedInUserList = json["clockedInUserList"];			        
			        dfd.resolve(clockedInUserList);

			    }, "json").fail(function() {
			    dfd.reject(I18n.t("failed.to.send.clock.in.request"));
			});
			
			return dfd.promise();
		},
		
		clockOut : function(terminal_id, user_id, time_out){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['user_id'] = user_id;
			post['time_out'] = time_out;
			post['action'] = "clockOut";

			post = JSON.stringify(post);

			jQuery.get(
			    "/clockinout/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject(I18n.t("failed.to.clock.out.user"));
			            return;
			        }

			        if (json.error) {
			            dfd.reject(I18n.t("failed.to.clock.out.user") +" "+ json.error);
			            return;
			        }
			        
			        var clockedInUserList = json["clockedInUserList"];			        
			        dfd.resolve(clockedInUserList);
			       

			    }, "json").fail(function() {
			    dfd.reject(I18n.t("failed.to.send.clock.out.request"));
			});
			
			return dfd.promise();		
			
		},
		
		clockOutAll : function(terminal_id, time_out){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['time_out'] = time_out;
			post['action'] = "clockOutAll";

			post = JSON.stringify(post);

			jQuery.get(
			    "/clockinout/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject(I18n.t("failed.to.clock.out.all.users"));
			            return;
			        }

			        if (json.error) {
			            dfd.reject(I18n.t("failed.to.clock.out.all.users") +" "+ json.error);
			            return;
			        }
			        
			        
			        dfd.resolve(I18n.t("you.have.successfully.clocked.out.all.users"));
			        
			        			       

			    }, "json").fail(function() {
			    dfd.reject(I18n.t("failed.to.send.clock.out.all.request"));
			});
			
			return dfd.promise();		
			
		},
		
		getClockedInUsers : function(terminal_id){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['action'] = "getClockedInUsers";

			post = JSON.stringify(post);

			jQuery.get(
			    "/clockinout/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject(I18n.t("failed.to.query.clocked.in.users"));
			            return;
			        }

			        if (json.error) {
			            dfd.reject(I18n.t("failed.to.query.clocked.in.users") + " " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject(I18n.t("failed.to.query.clocked.in.users"));
			});
			
			return dfd.promise();			
		},
		
		setSalesRep : function(id){
			
			if(USER.ad_user_id == id) return;
			
			var user = APP.USER.getUserById(id);						
			var role = APP.ROLE.getRoleById(user.ad_role_id);
			
			/* check if user is active */
            if ( user.isactive == 'N' ) {
            	
            	alert(I18n.t("user.deactivated"));                
                return;
            	
            }

            sessionStorage.removeItem('user');
            sessionStorage.setItem('user', Object.toJSON(user));

            sessionStorage.removeItem('role');
            sessionStorage.setItem('role', Object.toJSON(role));
            
            /* reload window */
            window.location.reload();
            
            return;
            
            
			
			var xxxx = APP.USER.getUserById(id);
			
			var html = "<table id='change-salesrep-table'>" +
					"<tr><th>Username</th><td>" + xxxx.name + "</td></tr>" +
					"<tr><th>Password</th><td>" +
					"<input type='password' id='change-salesrep-password'>" + 
					"</td></tr>" +
					"</table>";
			
			BootstrapDialog.show({
	            title: 'Change User',
	            cssClass: 'change-salesrep-dialog',
	            message: html,
	            onshown: function(dialogRef){
	            	jQuery("#change-salesrep-password").focus();
	            },
	            buttons: [{
	                label: 'OK',
	                action: function(dialog) {
	                    
	                	var password = jQuery("#change-salesrep-password").val();
	                	
	                	var user = xxxx;
	                	
	                	user = APP.USER.getUser(user.name, password);

                        if (!user) {

                            alert(I18n.t("invalid.username.password"));
                            jQuery("#change-salesrep-password").focus();

                            return false;
                        }
	                    
	                    var user = APP.USER.getUserById(id);						
	        			var role = APP.ROLE.getRoleById(user.ad_role_id);

	                    sessionStorage.removeItem('user');
	                    sessionStorage.setItem('user', Object.toJSON(user));

	                    sessionStorage.removeItem('role');
	                    sessionStorage.setItem('role', Object.toJSON(role));
	                    
	                    /* reload window */
	                    window.location.reload();
	                }
	            }]
	        });
			
			
		},
		
		render : function(){
			
			return;

			if($('sales-rep-list') == null)
			{
				return;
			}
			
			$('sales-rep-list').innerHTML = '';
			$('clockedInSalesRep').innerHTML = "";
			
			var styleClass = null;
			var style = null;
			
			for(var i=0; i < this.clockedInUsers.length; i++)
			{
				styleClass = 'clock-in-row';
				style = '';

				var user_id = this.clockedInUsers[i].user_id;
				var time_in = this.clockedInUsers[i].time_in;
				
				var user = APP.USER.getUserById(user_id);				
				var username = user["name"];

				if (i==0)
				{
					style = 'margin-top: 16px;';
				}

				var div = document.createElement('div');
				div.setAttribute('class', 'row ' + styleClass);
				div.setAttribute('onclick', 'javascript: new ClockInOutPanel(\''+username+'\').show()');

				var div2 = document.createElement('div');
				div2.setAttribute('class', 'col-md-6 col-xs-6 padding-left-24');
				div2.setAttribute('style', style);

				var div3 = document.createElement('div');
				div3.setAttribute('class', 'pull-left');
				div3.innerHTML = username;

				div2.appendChild(div3);
				div.appendChild(div2);

				div2 = document.createElement('div');
				div2.setAttribute('class', 'col-md-4 col-xs-4 padding-left-16');
				div2.setAttribute('style', style);

				div3 = document.createElement('div');
				div3.setAttribute('class', 'pull-left');

				if (time_in != null)
				{
					div3.innerHTML = moment(time_in).fromNow();
				} 
				else
				{
					div3.innerHTML = '&nbsp';
				}


				div2.appendChild(div3);
				div.appendChild(div2);

				div2 = document.createElement('div');
				div2.setAttribute('class', 'col-md-2 col-xs-2 padding-right-8');
				div2.setAttribute('style', style);

				div3 = document.createElement('div');
				div3.setAttribute('class', 'pull-right');


				var iconDiv = document.createElement('div')
				iconDiv.setAttribute('class', 'glyphicons glyphicons-pro clock');
				div3.appendChild(iconDiv);

				div2.appendChild(div3);
				div.appendChild(div2);

				$('sales-rep-list').appendChild(div);				
				
				// render footer
				$('clockedInSalesRep').innerHTML += '<button id="salesRep' + user_id + '" class="employee" onclick="ClockInOut.setSalesRep(' + user_id + ')"><span>' + username + '</span><br><span id="salesRepAmount' + user_id + '">' + ShoppingCartManager.getCurrencySymbol() + ' 0.00</span></button>';				
				
			}
			
			jQuery("#clockedInSalesRep button").removeClass('active-sales-rep');				
			jQuery("#salesRep" + USER.ad_user_id).addClass('active-sales-rep');
			
			if(OrderScreen){
				OrderScreen.updateSplitAmounts();
			}
		}
};