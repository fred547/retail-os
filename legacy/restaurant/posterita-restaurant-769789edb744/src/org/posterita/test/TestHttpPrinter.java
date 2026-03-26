package org.posterita.test;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;

public class TestHttpPrinter {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		String hostname = "192.168.100.31";
		int port = 9100;
		String text = "Testing printer cover open\n\n";
		
		Socket soc = null;
		
		try 
		{
			soc = new Socket();
			soc.connect(new InetSocketAddress(hostname, port), 1500);
			//BufferedReader bis = new BufferedReader(new InputStreamReader(soc.getInputStream()));
			BufferedOutputStream bos = new BufferedOutputStream(soc.getOutputStream());
			bos.write(text.getBytes());
			bos.flush();
			
			/*
			String printerResponse = null;
			
			while ((printerResponse = bis.readLine()) != null) {
				System.out.println("Response -> " + printerResponse);  
			}
			*/
			
			
			
			bos.close();
			//bis.close();
			soc.close();
			
			System.out.println("sent");
		} 
		catch(SocketTimeoutException se) 
		{
			System.out.println("Connection timeout!");
		}
		catch (IOException e) 
		{
			System.out.println("Error: " + e.getMessage());
		}
		finally
		{
			try {
				soc.close();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			
			soc = null;
		}

	}

}
