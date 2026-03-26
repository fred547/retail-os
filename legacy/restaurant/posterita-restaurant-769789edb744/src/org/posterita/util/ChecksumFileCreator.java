package org.posterita.util;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;

import org.apache.commons.codec.digest.DigestUtils;

public class ChecksumFileCreator {

	public static void main(String[] args) 
	{
		if(args.length < 3)
		{
			System.err.println("Invalid number of arguments");
			
			return;
		}
		
		System.out.println("Creating checksum file");
		
		String baseDir = args[0];
		
		String checksumFilename = args[1];
		
		try 
		{
			BufferedWriter bw = new BufferedWriter(new FileWriter(baseDir + "/" + checksumFilename));
			
			for(int i=2; i<args.length; i++)
			{
				String filename = args[i];
				
				File file = new File(baseDir + "/" + filename);
				
				if(! file.exists() ) continue;
				
				String checksum = DigestUtils.md5Hex(new FileInputStream(file));				
				long size = file.length();
				
				System.out.print(filename + " " + checksum + " " + size + "\n");
				
				bw.write(filename + " " + checksum + " " + size + "\n");
			}
			
			bw.flush();
			bw.close();
			
		} 
		catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

}
