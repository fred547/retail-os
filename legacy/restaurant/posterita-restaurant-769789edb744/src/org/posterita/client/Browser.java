package org.posterita.client;

import java.awt.Desktop;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.URLEncoder;
import java.util.Optional;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.client.printing.PosteritaBridge;
import org.posterita.config.Configuration;
import org.posterita.model.Product;
import org.posterita.util.NetworkUtils;

import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.concurrent.Worker;
import javafx.event.EventHandler;
import javafx.geometry.HPos;
import javafx.geometry.VPos;
import javafx.scene.CacheHint;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextInputDialog;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.web.PromptData;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebErrorEvent;
import javafx.scene.web.WebEvent;
import javafx.scene.web.WebView;
import javafx.stage.FileChooser;
import javafx.util.Callback;
import netscape.javascript.JSObject;

public class Browser extends Region {

	protected static Logger log = Logger.getLogger(Browser.class);
	
	final WebView browser = new WebView();
	final WebEngine webEngine = browser.getEngine();
	final Browser reference;
	
	PosteritaBridge printerBridge = new PosteritaBridge();
	//Product product = new Product();

	public Browser(String url) {
		
		
		setCache(true);
		setCacheHint(CacheHint.SPEED);
		setCacheShape(true);
		
				
		// apply the styles
		getStyleClass().add("browser");
		// load the web page
		webEngine.load(url);
		// add the web view to the scene
		getChildren().add(browser);	
		
		reference = this;
		
		webEngine.getLoadWorker().stateProperty().addListener(new ChangeListener<Worker.State>() {
          public void changed(ObservableValue<? extends Worker.State> ov, Worker.State t, Worker.State t1) {
              if (t1 == Worker.State.SUCCEEDED) {
                  JSObject window = (JSObject) webEngine.executeScript("window"); 
                  
                  window.setMember("PosteritaBrowser", reference);
                  window.setMember("PosteritaBridge", printerBridge);
                  
                  //window.setMember("PRODUCT_DB", product);
              }
          }
      });
							
				
		webEngine.setOnAlert(new EventHandler<WebEvent<String>>() {
         public void handle(WebEvent<String> event) {     
        	
        	/* 
          	Dialogs.create()
              .owner(null)
              .title("Alert")
              //.masthead("Look, an Error Dialog")
              .message(event.getData())
              .showError();
              */
        	 
        	 Alert alert = new Alert(Alert.AlertType.INFORMATION);
             alert.setTitle("Information");
             alert.setHeaderText(null);
             alert.setContentText(event.getData());

             alert.showAndWait();
          }
        });
		
				
		webEngine.setConfirmHandler(new Callback<String, Boolean>() {
          public Boolean call(String msg) {
        	  /*
        	   	Action response = Dialogs.create()
				        .owner(null)
				        .title("")
				        //.masthead("You chose to exit")
				        .message(msg)
				        .actions(Dialog.Actions.YES, Dialog.Actions.NO)
				        .showConfirm();
			
			 return (response == Dialog.Actions.YES); 
        	   */
            
        	  Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        	  alert.setTitle("Confirmation");
        	  alert.setHeaderText(null);
        	  alert.setContentText(msg);

        	  Optional<ButtonType> result = alert.showAndWait();
        	  if (result.get() == ButtonType.OK){
        	      return true;
        	  } else {
        	      return false;
        	  }
			 
          }
        });
		
		webEngine.setPromptHandler(new Callback<PromptData, String>() {
      	public String call(PromptData data){ 
      		/*
      		Optional<String> response = Dialogs.create()
      		        .owner(null)
      		        .title("")
      		        //.masthead("Look, a Text Input Dialog")
      		        .message(data.getMessage())
      		        .showTextInput(data.getDefaultValue());
      		
      		if (response.isPresent()) {
      		   return response.get();
      		}
      		*/
      		TextInputDialog dialog = new TextInputDialog(data.getDefaultValue());
      		dialog.setTitle("");
      		dialog.setHeaderText(null);
      		dialog.setContentText(data.getMessage());
      		
      		Optional<String> result = dialog.showAndWait();
      		if (result.isPresent()){
      			return result.get();
      		}
      		
      		return null;
      	}
		});
		
		webEngine.setOnError(new EventHandler<WebErrorEvent>() {
			public void handle(WebErrorEvent event) 
			{
				Exception ex = (Exception) event.getException();	
				
				/*							
				Dialogs.create()
		        .owner(null)
		        .title("Ooops, there was an error!")
		        .masthead("Look, an Exception Dialog")
		        .message(message)
		        .showException(event.getException());
		        */
				
				Alert alert = new Alert(Alert.AlertType.ERROR);
				alert.setTitle("Exception Dialog");
				alert.setHeaderText(null);
				alert.setContentText(ex.getMessage());

				// Create expandable Exception.
				StringWriter sw = new StringWriter();
				PrintWriter pw = new PrintWriter(sw);
				ex.printStackTrace(pw);
				String exceptionText = sw.toString();

				Label label = new Label("The exception stacktrace was:");

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
		});
	}

	@Override
	protected void layoutChildren() {
		double w = getWidth();
		double h = getHeight();
		layoutInArea(browser, 0, 0, w, h, 0, HPos.CENTER, VPos.CENTER);
	}

	@Override
	protected double computePrefWidth(double height) {
		return 1024;
	}

	@Override
	protected double computePrefHeight(double width) {
		return 768;
	}
	
	public void exit(){
		log.info("Exiting ...");
	}
	
	public void exit2(){
		this.exit();
	}
	
	public boolean downloadInventoryAvailableReport(){
		
		Configuration configuration = Configuration.get();
		
		boolean isServerReachable = NetworkUtils.isServerReachable();
    	if(!isServerReachable)
    	{
    		Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
	      	  alert.setTitle("Confirmation");
	      	  alert.setHeaderText(null);
	      	  alert.setContentText("Posterita server is unreacheable");
	
	      	  Optional<ButtonType> result = alert.showAndWait();
	      	  if (result.get() == ButtonType.OK){
	      	      return true;
	      	  } else {
	      	      return false;
	      	  }
    	}
    	
		String serviceURL = configuration.getServerAddress() + "/service/Stock/inventoryAvailableReport?format=csv&json="; 
		
		String merchantKey = configuration.getMerchantKey();
		String terminalKey = configuration.getTerminalKey();
		
		JSONObject post = new JSONObject();
		
		CloseableHttpClient client = NetworkUtils.getHttpClientInstance();
		HttpGet get = null;
		HttpResponse response = null;
		
		try 
		{
			post.put("merchantKey", merchantKey);
			post.put("terminalKey", terminalKey);
			
			serviceURL = serviceURL + URLEncoder.encode(post.toString(),"UTF-8");			
			
			get = new HttpGet(serviceURL);				
			response = client.execute(get);
						
			HttpEntity entity = response.getEntity();
			if (entity != null) {
			    
				InputStream inputStream = entity.getContent();
				
				FileChooser fileChooser = new FileChooser();
				  
				//Set extension filter
				FileChooser.ExtensionFilter extFilter = new FileChooser.ExtensionFilter("CSV files (*.csv)", "*.csv");
				fileChooser.getExtensionFilters().add(extFilter);
				fileChooser.setInitialFileName("inventory-available-report.csv");
              
				//Show save file dialog
				File file = fileChooser.showSaveDialog(null);
				
				if(file != null){
										
					BufferedInputStream bis = new BufferedInputStream(inputStream);
				    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
				    
				    int inByte;
				    while ((inByte = bis.read()) != -1 ) {
				    	bos.write(inByte);
				    }
				    
				    bis.close();
				    bos.close();
				    
				    return true;
					
				}
			}
		} 
		catch ( Exception e) 
		{
			log.error(e);
		}
		finally
		{
			try {
				client.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
		
		return false;
	}
	
	public boolean exportReport(String reportName)
	{
		CloseableHttpClient httpclient = HttpClients.createDefault();
		HttpGet httpGet = new HttpGet("http://localhost:8888/report/?name=" + reportName + "&format=csv");
		
		try 
		{
			CloseableHttpResponse response = httpclient.execute(httpGet);
			
			HttpEntity entity = response.getEntity();
			
			if (entity != null) {
			    
				InputStream inputStream = entity.getContent();
				
				FileChooser fileChooser = new FileChooser();
				  
				//Set extension filter
				FileChooser.ExtensionFilter extFilter = new FileChooser.ExtensionFilter("CSV files (*.csv)", "*.csv");
				fileChooser.getExtensionFilters().add(extFilter);
				fileChooser.setInitialFileName(reportName + ".csv");
              
				//Show save file dialog
				File file = fileChooser.showSaveDialog(null);
				
				if(file != null){
										
					BufferedInputStream bis = new BufferedInputStream(inputStream);
				    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
				    
				    int inByte;
				    while ((inByte = bis.read()) != -1 ) {
				    	bos.write(inByte);
				    }
				    
				    bis.close();
				    bos.close();
				    
				    return true;
					
				}
			}
			
			response.close();
		} 
		catch (Exception e) {
			log.error(e);
		}
		finally
		{
			try {
				httpclient.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
		
		return false;
	}
	
	public boolean exportPDF( int id ) {
		
		Configuration configuration = Configuration.get();
		
		boolean isServerReachable = NetworkUtils.isServerReachable();
    	if(!isServerReachable)
    	{
    		Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
	      	  alert.setTitle("Confirmation");
	      	  alert.setHeaderText(null);
	      	  alert.setContentText("Posterita server is unreacheable");
	
	      	  Optional<ButtonType> result = alert.showAndWait();
	      	  if (result.get() == ButtonType.OK){
	      	      return true;
	      	  } else {
	      	      return false;
	      	  }
    	}
    	
		String serviceURL = configuration.getServerAddress() + "/service/v2/Order/exportPDF?json="; 
		
		String merchantKey = configuration.getMerchantKey();
		String terminalKey = configuration.getTerminalKey();
		
		JSONObject post = new JSONObject();
		
		CloseableHttpClient client = NetworkUtils.getHttpClientInstance();
		HttpGet get = null;
		HttpResponse response = null;
		
		try 
		{
			post.put("id", id);
			post.put("merchantKey", merchantKey);
			post.put("terminalKey", terminalKey);
			
			serviceURL = serviceURL + URLEncoder.encode(post.toString(),"UTF-8");			
			
			get = new HttpGet(serviceURL);				
			response = client.execute(get);
			
			String contentType = response.getFirstHeader("Content-Type").getValue();
			String disposition = response.getFirstHeader("Content-disposition").getValue();
			
			String filename = disposition.substring(disposition.indexOf("\"") + 1, disposition.length()-1);
						
			HttpEntity entity = response.getEntity();
			if (entity != null) {
			    
				InputStream inputStream = entity.getContent();
				
				File file = null;
				
				if( Desktop.isDesktopSupported() ) {
					
					file = File.createTempFile("purchase", ".pdf");
				}
				else
				{
					FileChooser fileChooser = new FileChooser();
					  
					//Set extension filter
					FileChooser.ExtensionFilter extFilter = new FileChooser.ExtensionFilter("PDF files (*.pdf)", "*.pdf");
					fileChooser.getExtensionFilters().add(extFilter);
					fileChooser.setInitialFileName(filename);
	              
					//Show save file dialog
					file = fileChooser.showSaveDialog(null);
				}
				
				
				
				if(file != null){
										
					BufferedInputStream bis = new BufferedInputStream(inputStream);
				    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
				    
				    int inByte;
				    while ((inByte = bis.read()) != -1 ) {
				    	bos.write(inByte);
				    }
				    
				    bis.close();
				    bos.close();
				    
				    final File f = file;
				    
				    if( Desktop.isDesktopSupported() )
				    {
				        new Thread(() -> {				        	
				        	
				               try 
				               {
				            	   Desktop desktop = Desktop.getDesktop();
								   desktop.open(f);
								   
				               } catch (Exception e1) {
				                   e1.printStackTrace();
				               }
				               
				           }).start();
				    }				    
				    
				    return true;
					
				}
			}
		} 
		catch ( Exception e) 
		{
			log.error(e);
		}
		finally
		{
			try {
				client.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
		
		return false;
	}
}