package org.posterita.tray;

import java.awt.AWTException;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.net.URL;

import javax.swing.ImageIcon;
import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;

import org.posterita.exception.EmbeddedJettyServerException;
import org.posterita.server.EmbeddedJettyServer;


public class PrintServiceTrayIcon {
	
    public static void main(String[] args) {
       
        SwingUtilities.invokeLater(new Runnable() {
            public void run() {
                createAndShowGUI();
            }
        });
    }
     
    private static void createAndShowGUI() {
    	
    	EmbeddedJettyServer server = new EmbeddedJettyServer();   
    	
        try 
        {
			server.start();
		} 
        catch (EmbeddedJettyServerException e1) 
        {
			// TODO Auto-generated catch block
			e1.printStackTrace();
			JOptionPane.showMessageDialog(null, e1.getMessage(), "Posterita Service Error", JOptionPane.ERROR_MESSAGE, null);
			return;
		} 
        
        //Check the SystemTray support
        if (!SystemTray.isSupported()) {
            System.out.println("SystemTray is not supported");
            
            JOptionPane.showMessageDialog(null, "SystemTray is not supported!", "SystemTray", JOptionPane.ERROR_MESSAGE, null);
            
            return;
        }
        
        final PopupMenu popup = new PopupMenu();
        final TrayIcon trayIcon = new TrayIcon(createImage("/org/posterita/resources/icon-48x48.png", "posterita tray icon"));
        final SystemTray tray = SystemTray.getSystemTray();
         
        // Create a popup menu components
        MenuItem aboutItem = new MenuItem("About");
        MenuItem restartItem = new MenuItem("Restart");     
        MenuItem exitItem = new MenuItem("Exit");
         
        //Add components to popup menu
        popup.add(aboutItem);
        popup.addSeparator();
        popup.add(restartItem);
        popup.addSeparator();
        popup.add(exitItem);
         
        trayIcon.setPopupMenu(popup);
        trayIcon.setImageAutoSize(true);
        trayIcon.setToolTip("Posterita Printer Service");
         
        try {
            tray.add(trayIcon);
        } catch (AWTException e) {
            System.out.println("TrayIcon could not be added.");
            return;
        }
         
        trayIcon.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(null,
                        "Posterita Printer Service");
            }
        });
         
        aboutItem.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(null,
                        "Posterita Printer Service. Running on port 9998 and 9999");
            }
        });       
         
                 
        restartItem.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
            	
            	int reply = JOptionPane.showConfirmDialog(null, "Restart Posterita Printer Service", "Restart", JOptionPane.YES_NO_OPTION);
                if (reply == JOptionPane.YES_OPTION) {                	
                  //Restart
                	
                	try 
                    {
            			server.stop();
            			server.start();
            			
            			JOptionPane.showMessageDialog(null,
                                "Posterita Printer Service. Restarted on port 9998 and 9999");
            		} 
                    catch (EmbeddedJettyServerException e1) 
                    {
            			// TODO Auto-generated catch block
            			e1.printStackTrace();
            			JOptionPane.showMessageDialog(null, e1.getMessage(), "Posterita Service Error", JOptionPane.ERROR_MESSAGE, null);
            			return;
            		} 
                }
                else {
                   
                }
                
            }
        });       
         
        exitItem.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
            	
            	try 
                {
        			server.stop();
        		} 
                catch (EmbeddedJettyServerException e1) 
                {
        			// TODO Auto-generated catch block
        			e1.printStackTrace();
        			JOptionPane.showMessageDialog(null, e1.getMessage(), "Posterita Service Error", JOptionPane.ERROR_MESSAGE, null);
        		} 
            	
                tray.remove(trayIcon);
                System.exit(0);
            }
        });
    }
     
    //Obtain the image URL
    protected static Image createImage(String path, String description) {
        URL imageURL = PrintServiceTrayIcon.class.getResource(path);
         
        if (imageURL == null) {
            System.err.println("Resource not found: " + path);
            return null;
        } else {
            return (new ImageIcon(imageURL, description)).getImage();
        }
    }
}

