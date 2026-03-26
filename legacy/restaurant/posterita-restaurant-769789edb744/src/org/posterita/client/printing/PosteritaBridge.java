package org.posterita.client.printing;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import javax.print.DocFlavor;
import javax.print.DocPrintJob;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import javax.print.attribute.HashPrintRequestAttributeSet;

import org.apache.log4j.Logger;

public class PosteritaBridge {
	
	protected static Logger log = Logger.getLogger(PosteritaBridge.class);

	private String printerName = null;
	private String[] printerList = null;
	private PrintService pServices[];

	
	public PosteritaBridge()
	{
		loadPrintServices();
	}
	
	public void loadPrintServices()
	{
		pServices = getPrintServices();	    
	    printerList = new String[pServices.length];
	    
	    try
	    {    	        	    
    	    //take first as default
    	    if(pServices != null && pServices.length > 0)
    	    {
    	    	printerName = pServices[0].getName();
    	    }
    	    
    	    for (int i = 0; i < pServices.length; i++)
    	    {
    	        printerList[i] = pServices[i].getName();
    	    }
    	    
	    }
	    catch (Exception ex)
	    {
	        log.error("Could not initialise printers");
	    }
        
        log.info("Available printers: " + this.getPrintersAsJSON());
	}
	
	/**
	 * Removes network protocol from printer name (Java problem)
	 * @param name Name of printer
	 * @return Name trimmed from Network protocol
	 */
	private String getValidatedPrinterName(String name)
	{
	    if (name == null || name.length() == 0)
	    {
	        return name;
	    }
	    
	    if (name.startsWith("IPP") || name.startsWith("Win32"))
	    {
	        int index = name.indexOf(":");
	        name = name.substring(index + 1, name.length());
	        name = name.trim();
	    }
	    return name;
	}
	
	/**
	 * Get the system's print service by name
	 * @param name Name of Printer
	 * @return PrintService with the 
	 */
	private PrintService getPrintService(String name)
	{
		PrintService pService = null;
		if (name == null || name.trim().length() == 0)
		{
		    return null;
		}
		
		name = getValidatedPrinterName(name);
        PrintService pServices[] = getPrintServices();
        for (int i = 0; i < pServices.length; i++)
        {
            String pServiceName = pServices[i].getName();
            pServiceName = getValidatedPrinterName(pServiceName);
            if (name.equalsIgnoreCase(pServiceName))
            {
                pService = pServices[i];
                break;
            }
        }
		return pService;
	}
	
	/**
	 * Get the system's default print service
	 * @return Default PrintService
	 */
	private PrintService getDefaultPrintService()
	{
	    return PrintServiceLookup.lookupDefaultPrintService();
	}
	
	/**
	 * Get all the print services available on the system
	 * @return System available Print Services
	 */
	private PrintService[] getPrintServices()
	{
		/*
	    if (pServices != null && pServices.length > 0)
	    {
	        return pServices;
	    }
	    */
	    
	    return PrintServiceLookup.lookupPrintServices(null, null);
	}
	
	
	private boolean sendPrintData(String printData)
	{		
		return sendPrintData(this.printerName, printData);
	}
		
	private boolean sendPrintData(String printer, String printData)
	{
		log.info("sending commands to printer ==> " + printer );
		
		PrintService printService = getPrintService(printer);
		
		if (printService == null)
		{
		    log.error("Could not get printer with name: " + printer);
		    log.error("Taking default print service");
		    
		    printService = getDefaultPrintService();
		}
		
		if (printService == null)
		{
			log.error("No printers found");
		    
		    return false;
		}
		
		
		ByteArrayBuilder builder = new ByteArrayBuilder();
		
		//parse printData for images
		String[] printDataChunks = printData.split("<image>");
		for(int i=0; i<printDataChunks.length; i++)
		{
			String printDataChunk = printDataChunks[i];
			
			// image data encode in base64
			if(printDataChunk.startsWith("data:image"))
			{
				byte[] commands = ImageConvertor.getCommands(printDataChunk); 
				builder.append(commands);
			}
			else
			{
				builder.append(printDataChunk.getBytes());
			}
		}		
		
		InputStream is = new ByteArrayInputStream(builder.getByteArray());
		
		//send data to print
		SimpleDoc doc = new SimpleDoc(is, DocFlavor.INPUT_STREAM.AUTOSENSE, null);		
		DocPrintJob job = printService.createPrintJob();
				
		try 
		{
			job.print(doc, new HashPrintRequestAttributeSet());
			log.info("Job sent to printer succesfully");
		} 
		catch (Exception e) 
		{
			log.error("Failed to print!", e);
			return false;
		}		
		
		return true;
	}
	
	public void addJob(String text)
	{
		sendPrintData(text);
	}
	
	public void addJob(String printer, String text)
	{
		sendPrintData(printer, text);
	}
	
	/* Prints a base64 encoded image */
	public void printImage(String imageBase64)
	{
		byte[] commands = ImageConvertor.getCommands(imageBase64);    	
    	String image = new String(commands);
    	
    	sendPrintData(image);
	}

	
	public String getPrintersAsJSON()
	{
		StringBuffer json = new StringBuffer("");
		json.append("[");
		if(printerList != null && printerList.length > 0){
			for(int i=0; i<printerList.length; i++){
				String name = printerList[i];
				if(i>0){
					json.append(",");
				}
				json.append("\"" + name + "\"");
			}			
		}
		
		json.append("]");
		
		return json.toString();
	}
	
	public String getPrinterName() {
		return printerName;
	}

	public void setPrinterName(String printerName) {
		this.printerName = printerName;
	}
		
	public static void main(String[] args)
	{
		PosteritaBridge pb = new PosteritaBridge();
		
		pb.addJob("EPSON_TM-T20", "The quick brown fox jumped over the lazy dog. The quick brown fox jumped over "
				+ "the lazy dog.The quick brown fox jumped over the lazy dog.The quick brown fox jumped over the lazy dog.");
	}

}