package org.posterita.client;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.apache.commons.io.FileUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.log4j.Logger;
/*
import org.controlsfx.control.action.Action;
import org.controlsfx.dialog.Dialog;
import org.controlsfx.dialog.Dialogs;
*/
import org.posterita.config.Configuration;
import org.posterita.database.Database;
import org.posterita.database.DatabaseSynchronizer;
import org.posterita.database.DatabaseSynchronizerListener;
import org.posterita.exception.ConfigurationException;
import org.posterita.exception.DocumentNoSynchronizationException;
import org.posterita.exception.EmbeddedJettyServerException;
import org.posterita.exception.InvalidAccountException;
import org.posterita.exception.OrderSynchronizationException;
import org.posterita.exception.ReinstallationAccountException;
import org.posterita.exception.UpdaterException;
import org.posterita.server.EmbeddedJettyServer;
import org.posterita.test.FixData;
import org.posterita.translation.I18n;
import org.posterita.util.NetworkUtils;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.collections.FXCollections;
import javafx.concurrent.Service;
import javafx.concurrent.Task;
import javafx.concurrent.WorkerStateEvent;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressBar;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.effect.DropShadow;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.stage.StageStyle;
import javafx.stage.Window;
import javafx.stage.WindowEvent;

public class Posterita extends Application
{
	private static Logger log = Logger.getLogger(Posterita.class);
	
	public static String RESTART_FLAG = "restart.flag";
	private Stage stage;
	
	private Pane splashLayout;
	private Label progressText;
	private ProgressBar progressBar;
	
	String baseURL = "http://localhost:8888";	
	CustomCookieHandler cookieHandler;
	EmbeddedJettyServer server;
	
	ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
	
	public void init() throws Exception {
		//remove restart flag
		removeRestartFlag();	
	};
	
	@Override
	public void start(Stage stage) throws Exception 
	{
		this.stage = stage;
		
		//set version
		this.setVersion(stage);		
		
		//check configuration
		boolean isConfigured = Configuration.isConfigured();
		boolean isValid = true;
		
		try 
		{
			Configuration.get(false).test();
		} 
		catch (InvalidAccountException e) 
		{
			isValid = false;
		}
		catch (ReinstallationAccountException e) 
		{
			//do nothing
		}
		catch (Exception e2) 
		{
			log.error(e2);
		}
		
		if(isConfigured && isValid)
		{
			showSplashScreen();
		}
		else
		{
			final String [] languages = {"en", "fr", "cn"};
			
			Dialog<ButtonType> dlg = new Dialog<ButtonType>();
			dlg.setTitle("Language Selection");
			dlg.setHeaderText("Choose a language");
			//dlg.getDialogPane().setPrefSize(400, 200);
			
			
			ChoiceBox<String> cb = new ChoiceBox<String>(FXCollections.observableArrayList("English", "Français", "中国"));			
			
			GridPane grid = new GridPane();
			grid.add(cb, 0, 0);
			cb.setPrefWidth(300);
			
			dlg.getDialogPane().setContent(grid);
			
			ButtonType ok = new ButtonType("Ok");
			ButtonType cancel = new ButtonType("Cancel");
			
			dlg.getDialogPane().getButtonTypes().addAll(ok, cancel);
			
			cb.getSelectionModel().selectedIndexProperty().addListener(new ChangeListener<Number>() {
				public void changed(ObservableValue<? extends Number> observable, Number oldValue, Number newValue) {
					String selectedLanguage = languages[newValue.intValue()];
					I18n.init(selectedLanguage);	
					
					//ok.getB
				}
			});
			
			Optional<ButtonType> result = dlg.showAndWait();
			if (result.isPresent()) 
			{
				if(result.get() == cancel)
				{
					Platform.exit();
				}
			}
			else
			{
				Platform.exit();
			}
			
			setScene(ConfigurationScene());
		}
		
	}
	
	private void showSplashScreen()
	{
		ImageView splash = new ImageView(new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/splash.png")));
		progressText = new Label(I18n.t("loading"));
		//progressBar = new ProgressBar();
		splashLayout = new VBox();
		splashLayout.getChildren().addAll(splash, progressText);
		splashLayout.setStyle("-fx-padding: 30; -fx-background-color: #FFFFFF; -fx-border-width:2; -fx-border-color: linear-gradient(to bottom, derive(#005DAB, 50%), derive(#B2B4B7, 50%));");
		splashLayout.setEffect(new DropShadow());
		
		Scene splashScene = new Scene(splashLayout);
	    stage.initStyle(StageStyle.UNDECORATED);	    
	    stage.setScene(splashScene);
	    stage.show();
	    
	    Service<Void> service = new Service<Void>() {
			@Override
			protected Task<Void> createTask() {
				return new Task<Void>(){
					@Override
					protected Void call() throws Exception {
						
						//check server status
						if(NetworkUtils.isServerReachable()){
							
							//check for updates
							checkUpdates();
							
							//check for restart
							File flag = new File(RESTART_FLAG);
							if(flag.exists()){
								updateMessage(I18n.t("restarting.application"));
								//Platform.exit();
								System.exit(1);
								return null;
							}
														
							//synchronize data
							synchronize();
						}
						
						//Fix data
						FixData.fix();
												
						Database.purgeSyncData();
						
						//start embedded server
						startServer();	
						
						startScheduler();
						
						return null;
					}		
					

					protected void checkUpdates()
					{
						updateMessage(I18n.t("checking.for.updates"));
						
						Updater updater = new Updater(){
							
							public boolean beforeUpdate(){
								
								String message = I18n.t("new.version.available");
								updateMessage(message);
															
								return true;
							}
							
							public boolean afterUpdate(){
								
								String message = I18n.t("restarting.application");
								updateMessage(message);
																							
								//write restart file
								setRestartFlag();
								
								return true;
							}
							
							public void downloadFiles(final ArrayList<UpdateFileEntry> entries)
							{
								// TODO Auto-generated method stub
								CloseableHttpClient client = HttpClients.createDefault();
								HttpGet get = null;
								HttpResponse response = null;
								
								try 
								{
									// download and apply updates
									for(UpdateFileEntry entry : entries)
									{
										String filename = entry.getFilename();
										String fileurl = this.getRemoteUpdateDirectoryUrl() + "/" + filename;
										
										updateMessage(I18n.t("downloading", filename)); // String.format("Downloading %s ..", filename));
										
										long fileLength = entry.getLength();										
										log.info("Downloaded " + fileurl + " ==> " + fileLength);
										
										get = new HttpGet(fileurl);				
										response = client.execute(get);
													
										HttpEntity entity = response.getEntity();
										if (entity != null) {
										    
											InputStream inputStream = entity.getContent();											
											
											File file = new File(updateDir + filename);
											file.getParentFile().mkdirs();  
										    
										    BufferedInputStream bis = new BufferedInputStream(inputStream);
										    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
										    
										    byte data[] = new byte[4096];
								            long total = 0;
								            int count;
								            String message = null;
								            while ((count = bis.read(data)) != -1) {
								                // allow canceling with back button
								                
								                total += count;
								                // publishing the progress....
								                if (fileLength > 0){
								                	// only if total length is known
								                	updateProgress(total, fileLength);
								                	
								                	message = I18n.t("downloading.details", filename, (total/1024 + ""), (fileLength/1024 + ""));
								                	updateMessage(message);
								                }
								                    
								                bos.write(data, 0, count);
								            }
										    
										    bis.close();
										    bos.close();
										}
										
										updateMessage(I18n.t("successfully.updated", filename));										
										
									}
									
									// apply updates
									File dir = new File(updateDir);
									File[] updates = dir.listFiles();
									
									if(updates != null)
									{
										for(File update : updates)
										{
											String fileName = update.getName();
											
											if(update.isDirectory())
											{											
												FileUtils.copyDirectory(update, new File(fileName));
											}
											else
											{
												FileUtils.copyFile(update, new File(fileName));
											}
										}
									}
									
									afterUpdate();
									
								} 
								catch (Exception e) 
								{
									// TODO Auto-generated catch block
									log.error(e);
								} 
								finally
								{
									try {
										client.close();
									} catch (IOException e) {
										// TODO Auto-generated catch block
										log.error(e);
									}
								}
							}
							
						};
						
						try 
						{
							updater.start();
						}
						catch (UpdaterException e) 
						{
							log.error(e);
						}
						
					}
					
					protected void synchronize()
					{
						updateMessage(I18n.t("synchronizing"));
						
						try 
						{
							DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();	
							updateMessage(I18n.t("loading.database"));
							Database.initialize();	
							
							synchronizer.addListener( s -> updateMessage( s ));							
							
							//check if first time
							String json = Database.getAllFrom("TERMINAL");
							if("[]".equals(json))
							{
								updateMessage(I18n.t("synchronizing.database"));
								//synchronizer.synchronize();
								
								try {
									synchronizer.pullData();
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}
								
								try {
									updateMessage(I18n.t("updating.document.no"));
									synchronizer.synchronizeDocumentNo(true);
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								} 
							}
							else
							{									
								try {
									updateMessage(I18n.t("updating.document.no"));
									synchronizer.synchronizeDocumentNo(true);
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}
								
								try {
									updateMessage(I18n.t("pushing.orders"));
									synchronizer.synchronizeOrders(false, 0, false);
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}
								
								try {
									updateMessage(I18n.t("pushing.clockinout"));
									synchronizer.synchronizeClockInOut();
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}
								
								try {
									updateMessage(I18n.t("pushing.closetill"));
									synchronizer.synchronizeCloseTill();
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}
								
								try {
									updateMessage(I18n.t("synchronizing.database"));
									//synchronizer.synchronize();
									synchronizer.pullData();
								} catch (Exception e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
									log.error(e);
								}								 
							}							
							
							updateProgress(1, 1);
							updateMessage(I18n.t("synchronization.completed"));
						} 
						catch (Exception e) {
							updateMessage("ERROR: " + e.getMessage());
							log.error(e);
						}
					}
					
					protected void startServer()
					{
						updateMessage(I18n.t("starting.posterita"));
						
						// start jetty
						cookieHandler = new CustomCookieHandler(baseURL);
						server = new EmbeddedJettyServer();
												
						try 
						{
							server.start();
							
							updateMessage(I18n.t("posterita.started"));
							
							//org.posterita.model.Application.startServerMonitoring();
							
							
						} 
						catch (EmbeddedJettyServerException e) 
						{
							// TODO Auto-generated catch block
							e.printStackTrace();
							updateMessage(I18n.t("failed.to.start.posterita"));
							
							log.error(e);
						}
						
						// start heartbeat
						
					}
					
					protected void startScheduler() {
						
						Configuration config = Configuration.get(true);
						
						if("N".equalsIgnoreCase(config.getPushData())) return;
						
						scheduler.scheduleAtFixedRate(new Runnable() {
							
							DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();
							
							public void run() {
								
								log.info("Running order synchronizer ...");
								
								try 
								{
									synchronizer.synchronizeDocumentNo(false); 
									synchronizer.synchronizeOrders(false, 5, true); //sync 5 minutes old orders
									
								} catch (OrderSynchronizationException e) {
									log.warn(e.getMessage());
								} catch (DocumentNoSynchronizationException e) {
									log.warn(e.getMessage());
								}								
							}
						}, 5, 5, TimeUnit.MINUTES);
					}
					
					protected void stopScheduler() {
						scheduler.shutdown();
					}
				};
			}
		};
		
		progressText.textProperty().bind(service.messageProperty());
		//progressBar.progressProperty().bind(service.progressProperty());
		
		service.setOnSucceeded(new EventHandler<WorkerStateEvent>() 
		{
            public void handle(WorkerStateEvent t) 
            {            	
            	BorderPane border = new BorderPane();	
            	Browser browser = new Browser(baseURL + "#lang=" + I18n.getLanguage() + ";terminal=" + Configuration.get(false).getTerminalKey()){
        			public void exit(){
        				stage.fireEvent(
                                new WindowEvent(
                                        stage,
                                        WindowEvent.WINDOW_CLOSE_REQUEST
                                ));
        			}
        		};
        		
        		border.setCenter(browser);
        		Scene browserScene = new Scene(border, 1024, 768);  
        		
        		Window owner = stage.getOwner();
        		Stage previousStage = stage;
        		
        		stage = new Stage(StageStyle.DECORATED);
        		stage.initOwner(owner);
        		stage.setScene(browserScene);
        		//stage.setFullScreen(true);
        		stage.setMaximized(true);
        		stage.centerOnScreen();          		
        		        	    
        	    //set close handler
        	    stage.setOnCloseRequest(new EventHandler<WindowEvent>() {			
        			public void handle(WindowEvent event) {
        				
        				boolean close = onClose();
        				if(!close){
        					event.consume();
        				}
        			}
        		});   
        	    
        	    try {
					setVersion(stage);
				} catch (IOException e) {
					log.error(e);
				}
        		
        		stage.show(); 
        		previousStage.close();
            }
	    });
		
		service.start();
	}	
	
	private void setScene(Scene scene)
	{
		this.stage.hide();
		this.stage.setScene(scene);
		this.stage.centerOnScreen();
		this.stage.show();
	}
		
	private Scene ConfigurationScene()
	{
		GridPane grid = new GridPane();
		grid.setAlignment(Pos.CENTER);
		grid.setHgap(10);
		grid.setVgap(10);
		grid.setPadding(new Insets(25, 25, 25, 25));
		
		Text scenetitle = new Text(I18n.t("configure.posterita"));
		scenetitle.setFont(Font.font("Tahoma", FontWeight.NORMAL, 20));
		grid.add(scenetitle, 0, 0, 2, 1);

		Label serverURL = new Label(I18n.t("server.url") + ":");
		grid.add(serverURL, 0, 2);

		final TextField serverURLTextField = new TextField("https://my.posterita.com");
		grid.add(serverURLTextField, 1, 2);
		serverURLTextField.setMinWidth(200);

		Label merchantKey = new Label(I18n.t("merchant.key") + ":");
		grid.add(merchantKey, 0, 3);

		final TextField merchantKeyTextField = new TextField();
		grid.add(merchantKeyTextField, 1, 3);
		
		Label terminalKey = new Label(I18n.t("terminal.key") + ":");
		grid.add(terminalKey, 0, 4);

		final  TextField terminalKeyTextField = new TextField();
		grid.add(terminalKeyTextField, 1, 4);
		
		final CheckBox pullDataCheckBox = new CheckBox("Pull Data");
		final CheckBox pushDataCheckBox = new CheckBox("Push Data");
		
		pullDataCheckBox.setSelected(true);
		pushDataCheckBox.setSelected(true);
		
		grid.add(pullDataCheckBox, 0, 5);
		grid.add(pushDataCheckBox, 1, 5);
		
		Button saveBtn = new Button(I18n.t("save"));
		Button cancelBtn = new Button(I18n.t("cancel"));		
		
		HBox hbBtn = new HBox(10);
		hbBtn.setAlignment(Pos.BOTTOM_RIGHT);
		hbBtn.getChildren().addAll(saveBtn, cancelBtn);
		grid.add(hbBtn, 1, 7);
		
		//load previous configuration
		
		if(Configuration.isConfigured()){
			
			Configuration config = Configuration.get(false);
			
			serverURLTextField.setText(config.getServerAddress());
			merchantKeyTextField.setText(config.getMerchantKey());
			terminalKeyTextField.setText(config.getTerminalKey());
			pullDataCheckBox.setSelected("Y".equalsIgnoreCase(config.getPullData()));
			pushDataCheckBox.setSelected("Y".equalsIgnoreCase(config.getPushData()));
		}
		
        
        saveBtn.setOnAction(new EventHandler<ActionEvent>() {        	 
            
        	public void handle(ActionEvent e) {   	
            	
            	Configuration config = new Configuration();
            	
            	//validate inputs
            	String serverURL = serverURLTextField.getText();
            	String merchantKey = merchantKeyTextField.getText();
            	String terminalKey = terminalKeyTextField.getText();
            	
            	String pullData = pullDataCheckBox.isSelected() ? "Y" : "N"; 
            	String pushData = pushDataCheckBox.isSelected() ? "Y" : "N"; 
            	
            	if(serverURL == null || serverURL.trim().length() == 0){
            		Alert alert = new Alert(Alert.AlertType.INFORMATION);
					alert.initOwner(stage);
		            alert.setTitle(I18n.t("configuration.error")); 
		            alert.setHeaderText(null);
		            alert.setContentText(I18n.t("invalid.server.url"));	
		            alert.showAndWait();
		            return;
            	}
            	
            	if(merchantKey == null || merchantKey.trim().length() == 0){
            		Alert alert = new Alert(Alert.AlertType.INFORMATION);
					alert.initOwner(stage);
					alert.setTitle(I18n.t("configuration.error"));
		            alert.setHeaderText(null);
		            alert.setContentText(I18n.t("invalid.merchant.key"));	
		            alert.showAndWait();
		            return;
            	}
            	
            	if(terminalKey == null || terminalKey.trim().length() == 0){
            		Alert alert = new Alert(Alert.AlertType.INFORMATION);
					alert.initOwner(stage);
		            alert.setTitle(I18n.t("configuration.error"));		            
		            alert.setHeaderText(null);
		            alert.setContentText(I18n.t("invalid.terminal.key"));	
		            alert.showAndWait();
		            return;
            	}
            	
            	
				config.setServerAddress(serverURL);
				config.setMerchantKey(merchantKey);
				config.setTerminalKey(terminalKey);
				config.setPushData(pushData);
				config.setPullData(pullData);
				
				try 
				{
					config.test();				
					config.save();
					
					/*
					Dialogs.create()
		            .owner(stage)
		            .title("Info")
		            .masthead(null)
		            .message("Configuration saved!")
		            .showInformation(); 
		            */
					
					Alert alert = new Alert(Alert.AlertType.INFORMATION);
					alert.initOwner(stage);
		            alert.setTitle(I18n.t("information"));
		            alert.setHeaderText(null);
		            alert.setContentText(I18n.t("configuration.saved"));	
		            alert.showAndWait();
					
					restartApplication();
				} 
				catch (ReinstallationAccountException e1) 
				{
					/*
					Action response = Dialogs.create()
					        .owner(stage)
					        .title("Reinstallation")
					        //.masthead("You chose to exit")
					        .message("The terminal key [" + config.getTerminalKey() + "] is already in use.\nIf it is a reinstallation, click YES to continue. Else contact your reseller.")
					        .actions(Dialog.Actions.YES, Dialog.Actions.NO)
					        .showConfirm();
					*/
					
				  Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
	        	  alert.setTitle(I18n.t("reinstallation"));
	        	  alert.setHeaderText(null);
	        	  alert.setContentText(I18n.t("reinstallation.confimation.message", config.getTerminalKey()));

	        	  Optional<ButtonType> result = alert.showAndWait();
	        	  
					if (result.get() == ButtonType.OK) 
					{	   
						try 
						{
							config.save();
							
							/*
							Dialogs.create()
				            .owner(stage)
				            .title("Info")
				            .masthead(null)
				            .message("Configuration saved!")
				            .showInformation(); 
				            */
							
							Alert alert2 = new Alert(Alert.AlertType.INFORMATION);
							alert2.initOwner(stage);
				            alert2.setTitle(I18n.t("information"));
				            alert2.setHeaderText(null);
				            alert2.setContentText(I18n.t("configuration.saved"));	
				            alert2.showAndWait();
							
							restartApplication();
						} 
						catch (ConfigurationException e2) 
						{
							/*
							Dialogs.create()
				            .owner(stage)
				            .title("Error")
				            .masthead(null)
				            .message(e2.getMessage())
				            .showError();
				            */
							
							Alert alert3 = new Alert(Alert.AlertType.ERROR);
							alert3.initOwner(stage);
							alert3.setTitle(I18n.t("configuration.error"));
							alert3.setHeaderText(null);
							alert3.setContentText(e2.getMessage());

							// Create expandable Exception.
							StringWriter sw = new StringWriter();
							PrintWriter pw = new PrintWriter(sw);
							e2.printStackTrace(pw);
							String exceptionText = sw.toString();

							Label label = new Label("The exception stacktrace was :");

							TextArea textArea = new TextArea(exceptionText);
							textArea.setEditable(false);
							textArea.setWrapText(true);

							textArea.setMaxWidth(Double.MAX_VALUE);
							textArea.setMaxHeight(Double.MAX_VALUE);
							GridPane.setVgrow(textArea, Priority.ALWAYS);
							GridPane.setHgrow(textArea, Priority.ALWAYS);

							GridPane expContent = new GridPane();
							expContent.setMaxWidth(Double.MAX_VALUE);
							expContent.add(label, 0, 0);
							expContent.add(textArea, 0, 1);

							// Set expandable Exception into the dialog pane.
							alert3.getDialogPane().setExpandableContent(expContent);

							alert3.showAndWait();
						}						
					}
					else
					{
						
					}
				}
				catch (Exception e1) 
				{
					/*
					Dialogs.create()
		            .owner(stage)
		            .title("Error")
		            .masthead(null)
		            .message(e1.getMessage())
		            .showError();
		            */
					
					Alert alert = new Alert(Alert.AlertType.ERROR);
					alert.initOwner(stage);
					alert.setTitle(I18n.t("configuration.error"));
					alert.setHeaderText(null);
					alert.setContentText(e1.getMessage());

					// Create expandable Exception.
					StringWriter sw = new StringWriter();
					PrintWriter pw = new PrintWriter(sw);
					e1.printStackTrace(pw);
					String exceptionText = sw.toString();

					Label label = new Label("The exception stacktrace was :");

					TextArea textArea = new TextArea(exceptionText);
					textArea.setEditable(false);
					textArea.setWrapText(true);

					textArea.setMaxWidth(Double.MAX_VALUE);
					textArea.setMaxHeight(Double.MAX_VALUE);
					GridPane.setVgrow(textArea, Priority.ALWAYS);
					GridPane.setHgrow(textArea, Priority.ALWAYS);

					GridPane expContent = new GridPane();
					expContent.setMaxWidth(Double.MAX_VALUE);
					expContent.add(label, 0, 0);
					expContent.add(textArea, 0, 1);

					// Set expandable Exception into the dialog pane.
					alert.getDialogPane().setExpandableContent(expContent);

					alert.showAndWait();
				} 
            }
        });
        
        cancelBtn.setOnAction(new EventHandler<ActionEvent>() {        	 
           public void handle(ActionEvent e) {
            	try 
            	{
					Platform.exit();
				} 
            	catch (Exception e1) {
            		log.error(e1);
				}
            }
        });
        
        VBox vbox = new VBox();
        vbox.setAlignment(Pos.CENTER);
        
        Image img = new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/config-2.png"));
		ImageView imgView = new ImageView(img);
		
		vbox.getChildren().add(imgView);
		vbox.getChildren().add(grid);

		Scene scene = new Scene(vbox, 400, 400);
		
		return scene;
	}
	
	private void restartApplication()
	{
		setRestartFlag();
		//Platform.exit();
		System.exit(1);
		
	}
	
	public void setRestartFlag()
	{
		try 
		{
			FileWriter fw = new FileWriter(RESTART_FLAG);
			fw.write("Restart");
			fw.close();
		} 
		catch (IOException e) 
		{
			log.error(e);
		}
	}
	
	public void removeRestartFlag()
	{
		File flag = new File(RESTART_FLAG);
		if(flag.exists()){
			flag.delete();
		}
	}
	
	private void setVersion(Stage stage) throws IOException
	{
		String version = "";
		String date = "";
		
		// load version from posterita properties 
		Properties properties = new Properties();
		properties.load(ClassLoader.getSystemResourceAsStream("org/posterita/posterita.properties"));
		
		version = properties.getProperty("version");
		if(version == null)
		{
			version = "1.0";
		}
		
		date = properties.getProperty("date");
		if(date != null)
		{
			version = version + "." + date;
		}
		
		stage.setTitle("Posterita " + version);
		
		Image icon1 = new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/icon-16x16.png"));
		Image icon2 = new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/icon-32x32.png"));
		Image icon3 = new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/icon-48x48.png"));
		
		stage.getIcons().addAll(icon1, icon2, icon3);
	}
	
	public boolean onClose()
	{
		/*
		Action response = Dialogs.create()
		        .owner(stage)
		        .title("Confirm Exit")
		        //.masthead("You chose to exit")
		        .message("Do you want to exit?")
		        .actions(Dialog.Actions.YES, Dialog.Actions.NO)
		        .showConfirm();

		if (response == Dialog.Actions.NO) {
		    // ... user chose NO
			return false;

		}
		*/
		
		Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
		alert.initOwner(stage);
  	  	alert.setTitle(I18n.t("confirm.exit"));
  	  	alert.setHeaderText(null);
  	  	alert.setContentText(I18n.t("do.you.want.to.exit"));
  	  
	  	Optional<ButtonType> result = alert.showAndWait();
	  	  
		if (result.get() == ButtonType.CANCEL) 
		{	
			return false;
		}
		
		// ..user chose YES
		// save cookies
		if(cookieHandler != null)
		{
			cookieHandler.saveCookies();
		}
		
		if(server != null)
		{
			// stop jetty
			try 
			{
				server.stop();
			} 
			catch (EmbeddedJettyServerException e) {
				log.error(e);
			}
			
			//org.posterita.model.Application.stopServerMonitoring();
		}
		
		scheduler.shutdown();
		
		if(!NetworkUtils.isServerReachable()){
			return true;
		}
		
		Service<Void> service = new Service<Void>() {
		    @Override
		    protected Task<Void> createTask() {
		        return new Task<Void>() {
		            @Override
		            protected Void call() throws InterruptedException {
		                
		            	try 
						{
							DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();	
							
							updateProgress(1, 5);
							updateMessage(I18n.t("updating.document.no"));
							synchronizer.synchronizeDocumentNo(true); 
							
							updateProgress(2, 5);							
							updateMessage(I18n.t("pushing.orders"));
							synchronizer.synchronizeOrders(false, 0, false);
							
							updateProgress(3, 5);
							updateMessage(I18n.t("pushing.clockinout"));
							synchronizer.synchronizeClockInOut();
							
							updateProgress(4, 5);
							updateMessage(I18n.t("pushing.closetill"));
							synchronizer.synchronizeCloseTill();
							
							updateProgress(5, 5);
							updateMessage(I18n.t("Synchronization Completed"));
						} 
						catch (Exception e) {
							updateMessage("ERROR: " + e.getMessage());
							log.error(e);
						}
		            	
		                return null;
		            }
		        };
		    }
		};

		/*
		Dialogs.create()
		        .owner(stage)
		        .title("Closing Posterita")
		        .masthead("Pushing orders ...")
		        .showWorkerProgress(service);

		service.start();
		*/
		
		ImageView splash = new ImageView(new Image(ClassLoader.getSystemResourceAsStream("org/posterita/resource/splash.png")));
		progressText = new Label(I18n.t("loading"));
		progressBar = new ProgressBar();
		splashLayout = new VBox();
		splashLayout.getChildren().addAll(splash, progressBar, progressText);
		splashLayout.setStyle("-fx-padding: 30; -fx-background-color: #FFFFFF; -fx-border-width:2; -fx-border-color: linear-gradient(to bottom, derive(#005DAB, 50%), derive(#B2B4B7, 50%));");
		splashLayout.setEffect(new DropShadow());
		
		Scene splashScene = new Scene(splashLayout);
	    
	    Window owner = stage.getOwner();
		Stage previousStage = stage;
		
		stage = new Stage(StageStyle.UNDECORATED);
		stage.initOwner(owner);
		stage.setScene(splashScene);
		stage.centerOnScreen(); 
		
		stage.show(); 
		previousStage.close();
		
		
		progressBar.setMaxWidth(Double.MAX_VALUE);
		progressText.setMaxWidth(Double.MAX_VALUE);
		
		progressText.textProperty().bind(service.messageProperty());
		progressBar.progressProperty().bind(service.progressProperty());
		
		service.setOnSucceeded(new EventHandler<WorkerStateEvent>() 
		{
            public void handle(WorkerStateEvent t) 
            { 
            	System.exit(0);
            }
		});
		
		service.start();
		
		return false;
	}
	
	public static void main(String[] args){
		launch(args);
	}

}
