package org.posterita.test;

import org.posterita.client.Browser;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class TestBrowser extends Application{

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		launch(args);

	}

	@Override
	public void start(Stage primaryStage) throws Exception {
		// TODO Auto-generated method stub
		
		primaryStage.setTitle("Test Browser");
		
		Browser browser = new Browser("http://localhost:8888/html/1.0/index.html");
		Scene scene = new Scene(browser);
		
		primaryStage.setScene(scene);

        primaryStage.show();
		
	}

}
