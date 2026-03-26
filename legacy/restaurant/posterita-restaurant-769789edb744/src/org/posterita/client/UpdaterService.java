package org.posterita.client;

/*
import org.controlsfx.control.action.Action;
import org.controlsfx.dialog.Dialog;
import org.controlsfx.dialog.Dialogs;
*/

import javafx.application.Application;
import javafx.application.Platform;
import javafx.concurrent.Service;
import javafx.concurrent.Task;
import javafx.stage.Stage;

public class UpdaterService extends Service<Void>
{
	private Stage stage = null;

	public static void main(String[] args) {
		
		Application.launch();
		
		
	}

	@Override
	protected Task<Void> createTask() 
	{
		return new Task<Void>() {
			@Override
			protected Void call() throws Exception 
			{
				Updater updater = new Updater(){
					public boolean beforeUpdate(){
						
						/*
						Action response = Dialogs.create()
						        .owner(stage)
						        .title("Update")
						        //.masthead("You chose to exit")
						        .message("A new version is available.\nWould you like to install it?")
						        .actions(Dialog.Actions.YES, Dialog.Actions.NO)
						        .showConfirm();

						if (response == Dialog.Actions.NO) {
						    // ... user chose NO
							return false;
						}						
						*/
						return true;
					}
					
					public boolean afterUpdate(){
						/*
						Dialogs.create()
			            .owner(stage)
			            .title("Update")
			            .masthead(null)
			            .message("The update was completed successfully.\n"
			            		+ "Please restart the application in order the changes take effect.")
			            .showInformation(); 
						*/
						
						Platform.exit();
						
						return true;
					}
					
					public void onProgress(long a, long b)
					{
						updateProgress(a, b);
					}
					
					public void onMessage(String message)
					{
						updateMessage(message);
					}
				};
				
				updater.start();
				
				return null;
			}
		};
	}

}

class App extends Application
{

	@Override
	public void start(Stage stage) throws Exception {
		// TODO Auto-generated method stub
		
		UpdaterService service = new UpdaterService();
		
		/*
		Dialogs.create()
        .owner(stage)
        .title("Closing Posterita")
        .masthead("Pushing orders ...")
        .showWorkerProgress(service);

		service.start();
		*/
	}
	
}
