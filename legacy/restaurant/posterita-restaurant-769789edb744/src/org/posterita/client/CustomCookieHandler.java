package org.posterita.client;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.CookieStore;
import java.net.HttpCookie;
import java.net.URI;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.log4j.Logger;

import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.Priority;

/*
import org.controlsfx.dialog.Dialogs;
*/

public class CustomCookieHandler {
	
	private static Logger log = Logger.getLogger(CustomCookieHandler.class);

	private String url;
	private CookieManager manager;

	public CustomCookieHandler(String url) {
		this.url = url;		
		this.loadCookies();
	}

	public void loadCookies() {

		this.manager = new CookieManager();
		manager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
		CookieHandler.setDefault(this.manager);

		String cookies = "";

		try {
			// check for cookie store
			String cookieStorePath = getCookieStorePath();
			File cookieStore = new File(cookieStorePath);
			
			if (cookieStore.exists()) {
				// read cookies
				BufferedReader br = new BufferedReader(new FileReader(cookieStore));
				cookies = br.readLine();
				br.close();

				// load cookies
				if (cookies != null) {
					String[] entries = cookies.split(";");
					Map<String, java.util.List<String>> headers = new LinkedHashMap<String, java.util.List<String>>();
					headers.put("Set-Cookie", Arrays.asList(entries));
					CookieHandler ch = java.net.CookieHandler.getDefault();
					ch.put(URI.create(this.url), headers);
				}

			}
		} 
		catch (Exception e) 
		{
			log.error("Failed to load cookies!", e);
			/*
			Dialogs.create().owner(null).title("Cookie Handler")
			.message("Failed to load cookies!").showException(e);

			// TODO Auto-generated catch block
			e.printStackTrace();
			*/
			
			Alert alert = new Alert(Alert.AlertType.ERROR);
			alert.setTitle("Exception Dialog");
			alert.setHeaderText(null);
			alert.setContentText(e.getMessage());

			// Create expandable Exception.
			StringWriter sw = new StringWriter();
			PrintWriter pw = new PrintWriter(sw);
			e.printStackTrace(pw);
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
	}

	public void saveCookies() {

		if(manager == null)
		{
			return;
		}
		
		CookieStore cookieJar = manager.getCookieStore();
		List<HttpCookie> cookiesList = cookieJar.getCookies();

		String cookies = "";

		for (HttpCookie cookie : cookiesList) {
			cookies += cookie + ";";
		}

		try 
		{
			String cookieStorePath = getCookieStorePath();			
			FileOutputStream fos = new FileOutputStream(cookieStorePath, false);
			fos.write(cookies.getBytes());
			fos.flush();
			fos.close();

		} catch (Exception e) {
			
			log.error("Failed to save cookies!",e);
			
			/*
			Dialogs.create().owner(null).title("Cookie Handler")
			.message("Failed to save cookies!").showException(e);

			// TODO Auto-generated catch block
			e.printStackTrace();
			*/
			
			Alert alert = new Alert(Alert.AlertType.ERROR);
			alert.setTitle("Exception Dialog");
			alert.setHeaderText(null);
			alert.setContentText(e.getMessage());

			// Create expandable Exception.
			StringWriter sw = new StringWriter();
			PrintWriter pw = new PrintWriter(sw);
			e.printStackTrace(pw);
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
	}
	
	public static String getCookieStorePath()
	{
		String appDir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");
		
		
		 String OS = System.getProperty("os.name").toUpperCase();
		 
		 if (OS.contains("WIN")){
			 appDir = System.getenv("APPDATA") + separator + "posterita";
		 }
		 else if (OS.contains("MAC")){
			 appDir = System.getProperty("user.home") + "/Library/Application Support/posterita";
		 }
		 else if (OS.contains("NUX")){
			 appDir = System.getProperty("user.home") + separator + ".posterita";
		 }
		 
		String dbpath = appDir + separator + "cookie-store";
		
		return dbpath;
	}
}